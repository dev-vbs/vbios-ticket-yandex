use strict;
use warnings;
use utf8;
use Test::More;
use HTTP::Response;
use lib 'server/app/lib';

BEGIN {
    # Isolate the actual ticket methods from SHM's DB/bootstrap dependencies.
    $INC{'Core/Base.pm'}=1;
    $INC{'Core/Utils.pm'}=1;
    $INC{'Core/System/ServiceManager.pm'}=1;
    package Core::Base;
    sub import {}
    package Core::Utils;
    sub import { no strict 'refs'; *{caller().'::decode_json'}=\&JSON::decode_json; }
    package Core::System::ServiceManager;
    sub get_service { return $main::config }
    sub logger { die 'Unexpected logging' }
    sub import {
        no strict 'refs';
        *{caller().'::get_service'}=\&get_service;
        *{caller().'::logger'}=\&logger;
    }
}
use JSON ();
use Core::Ticket;
use Core::TicketAI;
use Core::TicketStorage;
our $config;
local $ENV{TICKET_S3_ACCESS_KEY}='TESTACCESS';
local $ENV{TICKET_S3_SECRET_KEY}='TESTSECRET';
{
    package ConfigFixture;
    sub data_by_name { $_[0]{ticket} }
    package DBFixture;
    sub selectrow_hashref {
        my ($s,$sql)=@_;
        return undef if $sql =~ /FROM ticket_media WHERE/;
        return {ticket_id=>1,user_id=>$s->{owner}||1,status=>'open',responder=>$s->{responder},subject=>'Подключение'} if $sql =~ /FROM tickets/;
        return {message_id=>10,is_admin=>0,message=>'Question'} if $sql =~ /FROM ticket_messages/;
        die "Unexpected query $sql";
    }
    sub selectrow_array {
        my ($s,$sql)=@_;
        return $s->{responder} if $sql =~ /SELECT responder/;
        return 10 if $sql =~ /MAX\(message_id\)/;
        return 0 if $sql =~ /COUNT/;
        die "Unexpected query $sql";
    }
    sub selectall_arrayref { [{is_admin=>0,message=>'Question'}] }
    sub do {
        my ($s,$sql,$attr,@params)=@_;
        push @{$s->{writes}},$sql;
        push @{$s->{operations}},[$sql,@params];
        $s->{responder}=$params[1] if $sql =~ /INSERT INTO ticket_preferences/;
        return 1;
    }
    sub begin_work {1}
    sub commit {$_[0]{commits}++; 1}
    sub rollback {1}
    sub err {undef}
    package TicketFixture;
    our @ISA=('Core::Ticket');
    sub dbh {$_[0]{db}}
    sub dbh_auto_commit {$_[0]{db}}
    sub user_id {1}
    sub telegram_sync { $_[0]{notified}++; $_[0]{handoff}=$_[2]; }
    sub _result { return {ticket_id=>$_[1],responder=>$_[0]{db}{responder}} }
    sub srv { $_[0]{push} }
    package PushFixture;
    sub send { my ($self,%args)=@_; push @{$self->{sent}},\%args; die 'push unavailable' if $self->{fail}; return {sent=>1} }
    package LogFixture;
    sub error { $_[0]{errors}++ }
}
$config=bless {ticket=>{ai=>{enabled=>1,reply_mode=>'auto',api_key=>'TEST',instructions=>'Support',max_tokens=>100}}},'ConfigFixture';
my $storage=Core::TicketStorage->new({bucket=>'test-bucket',access_key=>'TESTACCESS',secret_key=>'TESTSECRET'});
my $key='tickets/1/'.('a'x48).'.png';
my $url=$storage->download_url('test-bucket',$key,'20261111T000000Z');
like($url,qr{^https://test-bucket\.storage\.yandexcloud\.net/},'private object is addressed directly');
like($url,qr/X-Amz-Expires=900(?:&|$)/,'URL lifetime is bounded');
like($url,qr/X-Amz-Signature=1652783fd627fa844100cd3f8546aa7277561ebf30f301a974119cc739526be2$/,'signature matches independent Python hashlib vector');
unlike($url,qr/TESTSECRET/,'secret is never included in URL');
like($storage->download_url('test.bucket',$key,'20261111T000000Z'),qr{^https://storage.yandexcloud.net/test\.bucket/},'dotted buckets retain valid TLS host');
eval {$storage->download_url('test-bucket','../private')};
like($@,qr/Invalid object key/,'unsafe object keys rejected');
my $db=bless {responder=>'human',writes=>[]},'DBFixture';
my $ticket=bless {db=>$db},'TicketFixture';
{
    local $ENV{WEB_PUSH_ENABLE}='true';
    my $push=bless {sent=>[]},'PushFixture';
    $ticket->{push}=$push;
    $ticket->_push_reply_safe(42,100,"Ответ\nподдержки",'human');
    is($push->{sent}[0]{title},'Поддержка · Тикет #42','support push identifies the sender and ticket');
    is($push->{sent}[0]{body},"Подключение\nОтвет поддержки",'support push contains the subject and a readable message');
    is($push->{sent}[0]{url},'/tickets?ticket_id=42','support push opens the exact ticket');
    is($push->{sent}[0]{tag},'ticket-42-reply-100','each reply has a distinct tag');
    $ticket->_push_reply_safe(42,101,'x' x 200,'ai');
    is($push->{sent}[1]{title},'ИИ-помощник · Тикет #42','AI push identifies the sender and ticket');
    is($push->{sent}[1]{body},"Подключение\n" . ('x' x 179) . '…','long replies are bounded');
    $ticket->_push_reply_safe(42,103,'Фото','human',88);
    is($push->{sent}[2]{media_id},88,'attachment ID is sent to the push service');
    is($push->{sent}[2]{body},"Подключение\nФото\n📎 Изображение в обращении",'the attachment is mentioned even without a preview');
    $ticket->_push_reply_safe(42,104,'Фото','human','https://example.test');
    ok(!exists $push->{sent}[3]{media_id},'arbitrary attachment URLs are not sent');
    my $log=bless {},'LogFixture';
    $push->{fail}=1;
    no warnings 'redefine';
    local *Core::Ticket::logger=sub { $log };
    eval { $ticket->_push_reply_safe(42,102,'Ответ','human') };
    is($@,'','push delivery failure does not fail the saved reply');
    is($log->{errors},1,'push delivery failure is logged');
}
ok($ticket->api_options->{ai_available},'configured automatic AI is available');
$config->{ticket}{ai}{reply_mode}='draft';
ok(!$ticket->api_options->{ai_available},'draft-only AI is not offered as an automatic responder');
$config->{ticket}{ai}{reply_mode}='auto';
eval {$ticket->api_media_download(id=>99,delivery=>'url')};
like($@,qr/Attachment not found/,'no signed link is issued without attachment ownership');
$db->{owner}=2;
eval {$ticket->api_responder(ticket_id=>1,responder=>'human')};
like($@,qr/ticket not found/,'cannot switch another user ticket');
is(scalar @{$db->{writes}},0,'unauthorized switch does not write preferences');
$db->{owner}=1;
eval {$ticket->api_responder(ticket_id=>1,responder=>'anything')};
like($@,qr/Choose ai or human/,'invalid responder rejected');
{
    no warnings 'redefine';
    local *LWP::UserAgent::request=sub { die 'Provider must not be called for human tickets' };
    Core::TicketAI->reply($ticket,1);
}
is(scalar @{$db->{writes}},0,'human choice skips AI before claiming job or calling provider');
$db->{responder}='ai';
{
    $db->{mysql_insertid}=91;
    $db->{commits}=0;
    my @pushes;
    no warnings 'redefine';
    local *Core::Ticket::_push_reply_safe=sub { push @pushes, [@_, $db->{commits}] };
    local *LWP::UserAgent::request=sub { HTTP::Response->new(200,'OK',[],'{"choices":[{"message":{"content":"AI answer"}}]}') };
    Core::TicketAI->reply($ticket,1,10);
    is(scalar @pushes,1,'a published AI reply sends one push');
    is($pushes[0][2],91,'push refers to the saved reply');
    ok($pushes[0][-1] > 0,'push is sent after commit');
}
{
    local $config->{ticket}{ai}{enabled}=0;
    $db->{writes}=[];
    Core::TicketAI->reply($ticket,1,9);
    ok((grep {/status='skipped'/} @{$db->{writes}}),'disabled AI does not leave queued messages blocking the queue');
}
{
    $db->{writes}=[];
    no warnings 'redefine';
    local *LWP::UserAgent::request=sub { die 'Provider must not be called for an old message' };
    Core::TicketAI->reply($ticket,1,9);
    ok((grep {/status='skipped'/} @{$db->{writes}}),'a superseded queued message is skipped');
    ok(!(grep {/status='processing'/} @{$db->{writes}}),'a newer message is not claimed by the old job');
}
$db->{writes}=[];
{
    $db->{operations}=[];
    my @warnings;
    no warnings 'redefine';
    local $SIG{__WARN__}=sub { push @warnings, @_ };
    local *LWP::UserAgent::request=sub { HTTP::Response->new(429,'Too Many Requests',[],'sensitive provider response') };
    Core::TicketAI->reply($ticket,1,10);
    ok((grep { $_->[0] =~ /status='error'/ && $_->[1] eq 'HTTP 429' } @{$db->{operations}}),'provider failure is recorded for the claimed job');
    like(join('',@warnings),qr/HTTP 429/,'provider failure is visible in worker logs');
    unlike(join('',@warnings),qr/sensitive provider response/,'provider response body is not logged');
}
$db->{writes}=[];
{
    no warnings 'redefine';
    local *LWP::UserAgent::request=sub {
        # Simulate the user's handoff while the provider is answering.
        $db->{responder}='human';
        return HTTP::Response->new(200,'OK',[],'{"choices":[{"message":{"content":"AI answer"}}]}');
    };
    Core::TicketAI->reply($ticket,1);
}
ok((grep {/status='skipped'/} @{$db->{writes}}),'in-flight AI result is skipped after handoff');
ok(!(grep {/INSERT INTO ticket_messages/} @{$db->{writes}}),'handoff cannot publish the in-flight AI answer');
my $result=$ticket->api_responder(ticket_id=>1,responder=>'human');
is($result->{responder},'human','authorized selection is persisted');
ok($ticket->{handoff},'staff receives conversation context on handoff');
my $notifications=$ticket->{notified};
$ticket->api_responder(ticket_id=>1,responder=>'ai');
is($ticket->{notified},$notifications,'selecting AI does not notify the staff group');
{
    no warnings 'redefine';
    local *DBFixture::selectrow_array=sub {return 1};
    eval {$ticket->api_responder(ticket_id=>1,responder=>'ai')};
    like($@,qr/staff member has already joined/,'AI cannot take over after a staff reply');
}
done_testing;
