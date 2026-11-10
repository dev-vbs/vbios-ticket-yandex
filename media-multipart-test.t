use strict;use warnings;use Test::More;use MIME::Base64 qw(encode_base64);use HTTP::Response;
use lib 'server/app/lib';use Core::TicketTelegramMedia;
{package T;sub token {'TEST'} sub telegram_server {'https://proxy.example'}}
{package K;sub api_media_download {{name=>'test.png',mime_type=>'image/png',data=>MIME::Base64::encode_base64("\x89PNG\r\n\x1a\n\x00\xff",'')}}}
my $request;my $timeout;
{no warnings 'redefine';local *LWP::UserAgent::request=sub {my($ua,$r)=@_;$request=$r;$timeout=$ua->timeout;HTTP::Response->new(200,'OK',[],'{"ok":true,"result":{"message_id":10}}')};
my $r=Core::TicketTelegramMedia->outgoing(bless({},'T'),bless({},'K'),1,-100,12,'caption',{inline_keyboard=>[]});
is($r->{message_id},10,'response returned');is($timeout,90,'upload timeout 90 seconds');like($request->header('Content-Type'),qr/multipart\/form-data; boundary=/,'real multipart boundary');like($request->content,qr/name="photo"/,'photo field');like($request->content,qr/name="message_thread_id"\r\n\r\n12/,'topic routing');like($request->content,qr/\x89PNG\r\n\x1a\n\x00\xff/,'binary exact');like($request->uri->as_string,qr{/botTEST/sendPhoto$},'correct API endpoint');}
done_testing();
