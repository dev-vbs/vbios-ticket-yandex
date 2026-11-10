use strict;
use warnings;
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
        return {ticket_id=>1,user_id=>$s->{owner}||1,status=>'open',responder=>$s->{responder}} if $sql =~ /FROM tickets/;
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
        $s->{responder}=$params[1] if $sql =~ /INSERT INTO ticket_preferences/;
        return 1;
    }
    sub begin_work {1}
    sub commit {1}
    sub rollback {1}
    sub err {undef}
    package TicketFixture;
    our @ISA=('Core::Ticket');
    sub dbh {$_[0]{db}}
    sub dbh_auto_commit {$_[0]{db}}
    sub user_id {1}
    sub telegram_sync { $_[0]{notified}++; $_[0]{handoff}=$_[2]; }
    sub _result { return {ticket_id=>$_[1],responder=>$_[0]{db}{responder}} }
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
