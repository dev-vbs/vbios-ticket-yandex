use strict;
use warnings;
use utf8;
use Test::More;
use HTTP::Response;
use JSON ();
use lib 'server/app/lib';

BEGIN {
    $INC{'Core/Base.pm'} = 1;
    $INC{'Core/Utils.pm'} = 1;
    package Core::Base;
    sub import {}
}
sub Core::Utils::import {
    no strict 'refs';
    *{caller() . '::decode_json'} = \&JSON::decode_json;
}
use Core::Sms;

{
    package SmsFixture;
    our @ISA = ('Core::Sms');
    sub user { $_[0] }
    sub cache { $_[0] }
    sub phones { $_[0]{phone} }
    sub settings { $_[0]{settings} }
    sub set_settings { $_[0]{settings} = $_[1] }
    sub increment { ++$_[0]{attempts} }
}

local @ENV{qw(SMSC_ENABLED SMSC_LOGIN SMSC_PASSWORD SMSC_SENDER)} = ('true', 'fixture', 'fixture', '');
my $sms = bless { phone => '+7 999 123 45 67', settings => {} }, 'SmsFixture';
my @calls;
{
    no warnings 'redefine';
    local *LWP::UserAgent::post = sub {
        push @calls, [$_[1], $_[2]{phones}, $_[2]{mes}];
        return HTTP::Response->new(200, 'OK', [], '{"id":1,"cnt":1}');
    };
    is($sms->send(message => 'Test')->{accepted}, 0, 'SMS defaults to off');
    is($sms->api_set_settings(enabled => 1)->{enabled}, 1, 'consent enables SMS');
    is($sms->send(message => 'Test')->{accepted}, 1, 'provider accepted the message');
    is_deeply($calls[0], ['https://smsc.ru/sys/send.php', '79991234567', 'Test'], 'uses the account number');
    local $sms->{phone} = '+7 900 000 00 00';
    is($sms->send(message => 'Test')->{accepted}, 0, 'consent does not carry over to another phone');
    is(scalar @calls, 1, 'no calls without consent');
}
done_testing;
