#!/usr/bin/perl

use strict;
use v5.14;

my $cgi = CGI->new;

use CGI::Carp qw(fatalsToBrowser);

use Core::System::ServiceManager qw( get_service );
use Core::Utils qw(
    now
    parse_args
    get_user_ip
);

use SHM qw(:all);

my $cache = get_service('Core::System::Cache');
if ( $cache->get( get_user_ip() ) > 5 ) {
    print_header( status => 429 );
    print_json( { status => 429, error => '429 Too Many Requests'} );
    exit 0;
}

my $user = SHM->new( skip_check_auth => 1 );

my %in = parse_args();

if ( $in{session_id} ) {
    print_header(status => 400);
    print_json({status => 400, error => 'Use the supported authentication API'});
    exit 0;
}


my $session = get_service('sessions');
if ( $in{session_id} && $session->id( $session->hash_id( $in{session_id} ) ) ) {
    print_json( { status => 0, msg => 'Already authorized', session_id => $session->id, user_id => $session->user_id } );
	exit 0;
}

unless ( $in{login} && $in{password} ) {
	print_json( { status => 400, msg => 'login or password not present' } );
	exit 0;
}

my $result = $user->auth_api_safe(
    login => trim($in{login}), password => trim($in{password}), otp_token => $in{otp_token},
);
print_json($result || {status => 401, error => 'Authentication failed'});
$user->commit;

exit 0;

sub create_cookie {
        my $name = shift;
        my $value = shift;

        my $cookie = new CGI::Cookie(
                -name => $name,
                -value => $value,
                -expires =>  '+1M',
                -secure => get_service('config')->file->{session}->{'ssl'},
                # -httponly => 1,  # SECURITY: Защита от XSS
        );
        return $cookie;
}

