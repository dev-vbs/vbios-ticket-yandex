use strict;
use warnings;
use utf8;
use Test::More;
use JSON::PP ();
use HTTP::Response;
use lib 'server/app/lib';
use Core::TicketTelegramMedia;
{
    package SupportTG;
    sub http {
        my ($self,$method,%args)=@_;
        push @{$self->{calls}}, {method=>$method,%args};
        return HTTP::Response->new(200,'OK',[], $self->{fail}
            ? '{"ok":false,"error_code":403}'
            : '{"ok":true,"result":{"message_id":901}}');
    }
}
my $tg=bless {calls=>[]},'SupportTG';
my $caption='📱 Подключите VPN и нажмите «Обновить».';
my $entities=[{type=>'bold',offset=>3,length=>10}];
my $message={photo=>[{file_id=>'small'},{file_id=>'large'}],caption=>$caption,caption_entities=>$entities};
my $result=Core::TicketTelegramMedia->support_reply($tg,$message,123456,7);
is(scalar @{$tg->{calls}},1,'photo reply is one Telegram message');
my $call=$tg->{calls}[0];
is($call->{method},'sendPhoto','photo is sent directly, not copied from group');
is($call->{chat_id},123456,'transport explicitly targets private owner');
is($call->{data}{chat_id},123456,'payload explicitly targets private owner');
is($call->{data}{photo},'large','largest incoming photo is reused without reupload');
is($call->{data}{caption},$caption,'text remains attached to image');
is_deeply($call->{data}{caption_entities},$entities,'caption formatting and emoji offsets preserved');
ok(!exists $call->{data}{message_thread_id},'support topic is not sent to private chat');
is($call->{data}{reply_markup}{inline_keyboard}[0][0]{callback_data},'ticket_reply 7','same photo has a reply action');
is($result->{message_id},901,'photo message ID is available for native Reply mapping');
my $long='Я'x1024;
Core::TicketTelegramMedia->support_reply($tg,{photo=>[{file_id=>'long'}],caption=>$long},123456,7);
is($tg->{calls}[-1]{data}{caption},$long,'maximum source caption is not enlarged or truncated');
Core::TicketTelegramMedia->support_reply($tg,{document=>{file_id=>'doc',mime_type=>'image/png'},caption=>'Файл с пояснением'},123456,7);
is($tg->{calls}[-1]{method},'sendDocument','image sent as file remains a document');
is($tg->{calls}[-1]{data}{caption},'Файл с пояснением','document keeps its accompanying text');
Core::TicketTelegramMedia->support_reply($tg,{photo=>[{file_id=>'plain'}]},123456,7);
like($tg->{calls}[-1]{data}{caption},qr/тикету #7/,'captionless photo has a ticket reference');
Core::TicketTelegramMedia->support_reply($tg,{text=>'Ответ без картинки'},123456,7);
is($tg->{calls}[-1]{method},'sendMessage','text-only replies still work');
like($tg->{calls}[-1]{data}{text},qr/Ответ без картинки/,'text-only reply retains the answer');
eval {Core::TicketTelegramMedia->support_reply($tg,$message,-100777,7)};
like($@,qr/Invalid private destination/,'photo cannot be delivered to support group as destination');
$tg->{fail}=1;
eval {Core::TicketTelegramMedia->support_reply($tg,$message,123456,7)};
like($@,qr/code=403/,'blocked private chat is reported as failed delivery');

# Exercise the real group handler: cabinet persistence and private notification
# must use the same source caption and attachment, not just the helper in isolation.
{
    package SupportDB;
    sub selectrow_hashref { return {ticket_id=>7,user_id=>2,status=>'open'} }
    sub selectrow_array {0}
    sub do {my ($self,$sql,$attr,@params)=@_;push @{$self->{writes}},[$sql,@params];return 1}
    sub commit {1}
    sub rollback {1}
    package SupportUser;
    sub settings {$_[0]{settings}}
    package SupportGroup;
    our @ISA=('SupportTG');
    sub cfg {{id=>-100777}}
    sub get_service {{}}
    sub logger {bless {},'SupportLogger'}
    sub dbh {$_[0]{db}}
    sub message {$_[0]{message}}
    sub profile_name {'vBios_BOT'}
    sub user {$_[0]{owner}}
    sub ticket_link_reply {my $self=shift;push @{$self->{links}},[@_]}
    package SupportLogger;
    sub error {1}
}
open my $source,'<:encoding(UTF-8)','server/app/lib/Core/Transport/Telegram.pm' or die $!;
my $code=do {local $/;<$source>};close $source;
my ($handler)=$code =~ /(sub ticket_group_update \{.*?)\nsub ticket_copy_support_image/s;
die 'Missing group handler' unless $handler;
eval "package SupportGroup; $handler";die $@ if $@;
my $group=bless {
    calls=>[],links=>[],db=>bless({writes=>[],mysql_insertid=>42},'SupportDB'),
    owner=>bless({settings=>{telegram=>{vBios_BOT=>{chat_id=>123456}}}},'SupportUser'),
    message=>{%$message,chat=>{id=>-100777,type=>'supergroup'},from=>{is_bot=>0},message_id=>100,message_thread_id=>15},
},'SupportGroup';
{
    no warnings 'redefine';
    local *Core::TicketTelegramMedia::incoming=sub {{id=>88}};
    $group->ticket_group_update;
}
my ($saved)=grep {$_->[0] =~ /INSERT INTO ticket_messages/} @{$group->{db}{writes}};
is($saved->[-1],$caption,'actual handler saves support caption in cabinet');
my ($attachment)=grep {$_->[0] =~ /INSERT INTO ticket_message_media/} @{$group->{db}{writes}};
is_deeply([@$attachment[1,2]],[42,88],'actual handler links image to same cabinet message');
is(scalar @{$group->{calls}},1,'actual handler does not send a detached text notification');
is($group->{calls}[0]{data}{caption},$caption,'actual handler sends caption with photo');
is_deeply($group->{links}[0],[123456,901,7,2],'native Reply on photo maps to correct owner and ticket');
$group->{calls}=[];
$group->{links}=[];
$group->{owner}{settings}={};
{
    no warnings 'redefine';
    local *Core::TicketTelegramMedia::incoming=sub {{id=>88}};
    $group->ticket_group_update;
}
is($group->{calls}[0]{data}{chat_id},-100777,'staff is notified if private chat is not linked');
is($group->{calls}[0]{method},'sendMessage','missing private chat never redirects user image into group');
ok(!@{$group->{links}},'no successful private delivery is claimed when chat is missing');
done_testing;
