use strict;use warnings;use Test::More;use HTTP::Response;use lib 'server/app/lib';
{package CopyTG;sub http {my($s,$method,%a)=@_;$s->{method}=$method;$s->{args}=\%a;HTTP::Response->new(200,'OK',[],'{"ok":true,"result":{"message_id":200}}')}}
open my $f,'<:encoding(UTF-8)','server/app/lib/Core/Transport/Telegram.pm' or die $!;local $/;my $s=<$f>;my($method)=$s=~/(sub ticket_copy_support_image .*?)\n# Message-to-ticket/s;
eval "package CopyTG; $method";die $@ if $@;
my $tg=bless {},'CopyTG';my $r=$tg->ticket_copy_support_image(-100123,40,123456,7);
is($tg->{method},'copyMessage','copy source instead of uploading to group');is($tg->{args}{chat_id},123456,'transport destination private');is($tg->{args}{data}{chat_id},123456,'payload destination private');is($tg->{args}{data}{from_chat_id},-100123,'group is source only');ok(!exists $tg->{args}{data}{message_thread_id},'no group thread leaks into private delivery');is($r->{message_id},200,'private message available for Reply mapping');
eval {$tg->ticket_copy_support_image(-100123,40,-100123,7)};like($@,qr/Invalid private/,'group cannot become destination');done_testing();
