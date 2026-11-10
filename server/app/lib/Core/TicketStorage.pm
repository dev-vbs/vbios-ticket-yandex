package Core::TicketStorage;
use strict;
use warnings;
use MIME::Base64 qw(decode_base64);
use Digest::SHA qw(sha256_hex hmac_sha256 hmac_sha256_hex);
use POSIX qw(strftime);
use HTTP::Request;
use LWP::UserAgent;


sub new {
    my ($class,$cfg)=@_;
    die 'Ticket storage configuration is required' unless ref($cfg) eq 'HASH';
    my %c=%$cfg;
    $c{access_key}=$ENV{TICKET_S3_ACCESS_KEY} || $c{access_key};
    $c{secret_key}=$ENV{TICKET_S3_SECRET_KEY} || $c{secret_key};
    die 'Ticket S3 credentials are missing' unless $c{access_key} && $c{secret_key};
    die 'Invalid ticket bucket' unless ($c{bucket}||'') =~ /\A[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]\z/;
    # Only the Yandex HTTPS endpoint: configuration cannot redirect secrets elsewhere.
    $c{endpoint}='https://storage.yandexcloud.net';
    $c{region}='ru-central1';
    return bless {config=>\%c},$class;
}

sub decode_image {
    my ($class,$encoded)=@_;
    die 'Image is required' unless defined $encoded && length $encoded;
    die 'Image exceeds 5 MiB' if length($encoded)>6990508;
    die 'Invalid base64 image' unless $encoded =~ /\A(?:[A-Za-z0-9+\/]{4})*(?:[A-Za-z0-9+\/]{2}==|[A-Za-z0-9+\/]{3}=)?\z/;
    my $bytes=decode_base64($encoded);
    die 'Image exceeds 5 MiB' if length($bytes)>5*1024*1024;
    my ($mime,$ext);
    if (substr($bytes,0,8) eq "\x89PNG\r\n\x1a\n") {($mime,$ext)=('image/png','png')}
    elsif (substr($bytes,0,3) eq "\xff\xd8\xff") {($mime,$ext)=('image/jpeg','jpg')}
    elsif (substr($bytes,0,6) =~ /\AGIF8[79]a\z/) {($mime,$ext)=('image/gif','gif')}
    elsif (length($bytes)>=12 && substr($bytes,0,4) eq 'RIFF' && substr($bytes,8,4) eq 'WEBP') {($mime,$ext)=('image/webp','webp')}
    else {die 'Only JPEG, PNG, WebP and GIF images are supported'}
    return ($bytes,$mime,$ext);
}

sub key {
    my ($self,$uid,$ext)=@_;
    die 'Invalid owner' unless $uid =~ /\A[1-9][0-9]*\z/;
    open my $random,'<:raw','/dev/urandom' or die 'Secure random source unavailable';
    read($random,my $nonce,24)==24 or die 'Secure random read failed';
    close $random;
    return 'tickets/'.$uid.'/'.unpack('H*',$nonce).'.'.$ext;
}

sub signed_headers {
    my ($self,$method,$host,$path,$body,$mime,$timestamp)=@_;
    $timestamp ||= strftime('%Y%m%dT%H%M%SZ',gmtime(time));
    my $date=substr($timestamp,0,8);
    my $cfg=$self->{config};
    my $hash=sha256_hex($body);
    my %headers=(host=>$host,'x-amz-date'=>$timestamp,'x-amz-content-sha256'=>$hash);
    $headers{'content-type'}=$mime if defined $mime && length $mime;
    my @names=sort keys %headers;
    my $signed=join(';',@names);
    my $canonical_headers=join('',map {$_ . ':' . $headers{$_} . "\n"} @names);
    my $canonical=join("\n",$method,$path,'',$canonical_headers,$signed,$hash);
    my $scope="$date/ru-central1/s3/aws4_request";
    my $to_sign=join("\n",'AWS4-HMAC-SHA256',$timestamp,$scope,sha256_hex($canonical));
    my $k_date=hmac_sha256($date,'AWS4'.$cfg->{secret_key});
    my $k_region=hmac_sha256('ru-central1',$k_date);
    my $k_service=hmac_sha256('s3',$k_region);
    my $k_signing=hmac_sha256('aws4_request',$k_service);
    $headers{Authorization}='AWS4-HMAC-SHA256 Credential='.$cfg->{access_key}.'/'.$scope.
        ', SignedHeaders='.$signed.', Signature='.hmac_sha256_hex($to_sign,$k_signing);
    return \%headers;
}

sub request {
    my ($self,$method,$bucket,$key,$body,$mime)=@_;
    die 'Invalid object key' unless $key =~ /\Atickets\/[1-9][0-9]*\/[a-f0-9]{48}\.(?:jpg|png|webp|gif)\z/;
    die 'Invalid bucket' unless $bucket =~ /\A[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]\z/;
    my $c=$self->{config};
    # Match AWS CLI virtual-host addressing for DNS-compatible bucket names.
    # Dotted buckets use path addressing to retain strict TLS hostname checks.
    my $host=$bucket =~ /\./ ? 'storage.yandexcloud.net' : $bucket.'.storage.yandexcloud.net';
    my $path=$bucket =~ /\./ ? "/$bucket/$key" : "/$key";
    $body='' unless defined $body;
    my $headers=$self->signed_headers($method,$host,$path,$body,$mime);
    my $req=HTTP::Request->new($method=>'https://'.$host.$path);
    $req->header(%$headers);
    $req->content($body);
    # Never follow redirects with signed credentials; no request body/token logging.
    my $ua=LWP::UserAgent->new(timeout=>30,max_redirect=>0,ssl_opts=>{verify_hostname=>1});
    my $res=$ua->request($req);
    unless ($res->is_success) {
        # S3 XML Code is safe to log; never print raw XML, keys or request headers.
        my $body=$res->content || '';
        my ($code)=$body =~ m{<Code>([A-Za-z][A-Za-z0-9_.-]{0,79})</Code>};
        die 'Ticket object storage HTTP '.$res->code.' code='.($code || 'UnknownStorageError');
    }
    return $res->content;
}
1;
