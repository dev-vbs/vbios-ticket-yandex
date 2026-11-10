package Core::TicketTelegramMedia;
use strict;
use warnings;
use JSON::PP ();
use MIME::Base64 qw(encode_base64 decode_base64);
use HTTP::Request;
use HTTP::Request::Common qw(POST);
use LWP::UserAgent;

sub result {
    my ($class,$response)=@_;
    my $r=eval {JSON::PP->new->utf8->decode($response->content)} || {};
    unless ($r->{ok}) {
        my $code=$r->{error_code} || eval {$response->code} || 0;
        die 'Telegram media request failed code='.$code;
    }
    return $r->{result};
}
sub file_info {
    my ($class,$msg)=@_;
    if (ref($msg->{photo}) eq 'ARRAY' && @{$msg->{photo}}) {
        return $msg->{photo}[-1];
    }
    if ($msg->{document}) {
        die 'Only image documents are supported' unless ($msg->{document}{mime_type}||'') =~ m{\Aimage/(jpeg|png|webp|gif)\z};
        return $msg->{document};
    }
    die 'Unsupported attachment' if $msg->{video} || $msg->{animation} || $msg->{sticker} || $msg->{voice} || $msg->{audio};
    return;
}
sub incoming {
    my ($class,$tg,$ticket,$msg)=@_;
    my $info=$class->file_info($msg) or return;
    die 'Image exceeds 5 MiB' if ($info->{file_size}||0)>5*1024*1024;
    my $file=$class->result($tg->http('getFile',data=>{file_id=>$info->{file_id}}));
    my $path=$file->{file_path}||'';
    die 'Invalid Telegram file path' unless $path =~ m{\A[A-Za-z0-9_/-]+\.[A-Za-z0-9]+\z} && $path !~ /\.\./;
    my $base=$tg->telegram_server;
    die 'Telegram file endpoint must be HTTPS' unless $base =~ m{\Ahttps://[^\s?#]+\z};
    $base =~ s{/$}{};
    my $ua=LWP::UserAgent->new(timeout=>30,max_size=>5*1024*1024+1,max_redirect=>0,ssl_opts=>{verify_hostname=>1});
    my $res=$ua->get($base.'/file/bot'.$tg->token.'/'.$path);
    # Never log this URL: it contains the bot token.
    die 'Telegram file download failed' unless $res->is_success && !$res->header('Client-Aborted');
    require Core::TicketStorage;
    my ($bytes,$mime,$ext)=Core::TicketStorage->decode_image(encode_base64($res->content,''));
    return $ticket->api_media(name=>'telegram-'.$msg->{message_id}.'.'.$ext,mime_type=>$mime,data=>encode_base64($bytes,''));
}
sub outgoing {
    my ($class,$tg,$ticket,$media_id,$chat,$thread,$caption,$keyboard)=@_;
    my $file=$ticket->api_media_download(id=>$media_id); # owner check remains mandatory
    die 'Only image attachments can be sent' unless ($file->{mime_type}||'') =~ m{\Aimage/(jpeg|png|webp|gif)\z};
    # Build multipart directly: no generic transport UTF8 conversion or 10s timeout.
    my $photo=$file->{mime_type} =~ m{\Aimage/(jpeg|png)\z};
    my $method=$photo?'sendPhoto':'sendDocument';
    my $field=$photo?'photo':'document';
    my $base=$tg->telegram_server; $base =~ s{/$}{};
    die 'Telegram endpoint must be HTTPS' unless $base =~ m{\Ahttps://[^\s?#]+\z};
    my $bytes=decode_base64($file->{data});
    die 'Image exceeds 5 MiB' if length($bytes)>5*1024*1024;
    my $safe_name=$file->{name} || 'image';
    $safe_name =~ s{[\r\n\x00"/\\]}{_}g;
    require Encode;
    my @fields=(chat_id=>$chat,caption=>Encode::encode('UTF-8',$caption||''),
        $field=>[undef,Encode::encode('UTF-8',$safe_name),Content=>$bytes,Content_Type=>$file->{mime_type}]);
    push @fields,(message_thread_id=>$thread) if $thread;
    push @fields,(reply_markup=>JSON::PP->new->utf8->encode($keyboard)) if $keyboard;
    my $request=POST($base.'/bot'.$tg->token.'/'.$method,Content_Type=>'form-data',Content=>\@fields);
    my $ua=LWP::UserAgent->new(timeout=>90,max_redirect=>0,ssl_opts=>{verify_hostname=>1});
    my $response=$ua->request($request); # deliberately no token/body logging

    return $class->result($response);
}
1;
