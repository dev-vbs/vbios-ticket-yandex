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
    *{caller() . '::encode_json'} = \&JSON::encode_json;
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

local @ENV{qw(EXOLVE_SMS_ENABLED EXOLVE_API_KEY EXOLVE_SMS_SENDER)} = ('true', 'fixture', 'vBios');
my $sms = bless { phone => '+7 999 123 45 67', settings => {} }, 'SmsFixture';
my @calls;
{
    no warnings 'redefine';
    local *LWP::UserAgent::request = sub {
        push @calls, $_[1];
        return HTTP::Response->new(403, 'Forbidden') if @calls > 1;
        return HTTP::Response->new(200, 'OK', [], '{"message_id":"439166538239448536"}');
    };
    is($sms->send(message => 'Тест')->{accepted}, 0, 'SMS defaults to off');
    is($sms->api_set_settings(enabled => 1)->{enabled}, 1, 'consent enables SMS');
    is($sms->send(message => 'Тест')->{message_id}, '439166538239448536', 'provider returned an ID');
    is($calls[0]->uri->as_string, 'https://api.exolve.ru/messaging/v1/SendSMS', 'Exolve endpoint');
    is($calls[0]->header('Authorization'), 'Bearer fixture', 'Bearer authorization');
    is_deeply(JSON::decode_json($calls[0]->content), { number => 'vBios', destination => '79991234567', text => 'Тест' }, 'JSON request');
    eval { $sms->send(message => 'Тест') };
    is($@, "Exolve HTTP error 403\n", 'safe HTTP error');
    local $sms->{phone} = '+7 900 000 00 00';
    is($sms->send(message => 'Тест')->{accepted}, 0, 'consent is bound to the number');
    is(scalar @calls, 2, 'no calls without consent');
}
done_testing;
