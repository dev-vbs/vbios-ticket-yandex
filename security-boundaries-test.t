use strict;
use warnings;
use Test::More;
use Digest::SHA qw(sha256_hex);
use File::Temp qw(tempdir);
use File::Path qw(make_path);
use Cwd qw(realpath);

sub source {
    open my $fh, '<:encoding(UTF-8)', $_[0] or die $!;
    return do { local $/; <$fh> };
}
sub method {
    my ($file,$name)=@_;
    my ($s)=source($file)=~/(sub \Q$name\E \{.*?)(?=\nsub |\n1;|\z)/s;
    die "missing $name" unless $s;
    return $s;
}

{
    package CGI::Cookie;
    sub new { my ($c,%args)=@_; bless \%args,$c }
    package MemoryCache;
    sub set_json { $_[0]{$_[1]}=$_[2] }
    sub get_json { $_[0]{$_[1]} }
    sub delete { delete $_[0]{$_[1]} }
    package Core::Utils;
    our %cookies;
    our @queued;
    sub get_cookies { $cookies{$_[0]} }
    sub random_base64url { 'x' x 43 }
    sub queue_response_cookie { push @queued,$_[0] }
    package AuthBoundary;
    our $cache=bless {},'MemoryCache';
    sub cache { $cache }
    sub sha256_hex { Digest::SHA::sha256_hex($_[0]) }
}
for my $name (qw(public_origin allowed_request_origin safe_return_url get_user_ip)) {
    eval 'package Core::Utils; '.method('server/app/lib/Core/Utils.pm',$name); die $@ if $@;
}
local $ENV{HTTP_HOST}='bill.example';
local $ENV{HTTP_X_FORWARDED_PROTO}='https';
local $ENV{CORS_ALLOWED_ORIGINS}='';
ok(Core::Utils::allowed_request_origin('https://bill.example'),'same-origin allowed');
for ('https://evil.example','null','https://bill.example.evil','http://bill.example') {
    ok(!Core::Utils::allowed_request_origin($_),"untrusted origin rejected: $_");
}
for ('/','/profile','https://bill.example/login') {
    ok(Core::Utils::safe_return_url($_),"local redirect allowed: $_");
}
for ('//evil.example','/\\evil.example','https://evil.example','https://bill.example:444/','https://bill.example@evil.example',"/\r\nLocation: evil",'javascript:alert(1)') {
    ok(!Core::Utils::safe_return_url($_),'unsafe redirect rejected');
}
local $ENV{REMOTE_ADDR}='203.0.113.1';
local $ENV{HTTP_X_REAL_IP}='127.0.0.1';
is(Core::Utils::get_user_ip(),'203.0.113.1','caller cannot override client IP with X-Real-IP');

my $base='server/app/lib/Core/Auth/Base.pm';
my $guard='my $CALLBACK_GUARD = {};';
eval 'package AuthBoundary; '.$guard.join("\n",map {method($base,$_)} qw(callback_verified save_browser_state resolve_callback_state)); die $@ if $@;
my $auth=bless {},'AuthBoundary';
my $state='s' x 43;
my $ctx={state=>$state,provider=>'google',nonce=>'trusted-nonce',code_verifier=>'trusted-verifier',bind_to_profile=>0,session_id=>'trusted-session',return_url=>'/profile'};
$auth->save_browser_state($ctx,'oauth2_state',600);
is($Core::Utils::queued[0]{'-samesite'},'Lax','state cookie permits provider navigation only');
ok($Core::Utils::queued[0]{'-httponly'},'state cookie is HttpOnly');
ok($Core::Utils::queued[0]{'-secure'},'HTTPS state cookie is Secure');
ok(!$auth->resolve_callback_state({state=>$state},'oauth2_state'),'another browser cannot consume state');
$Core::Utils::cookies{'auth_state_'.$state}='x' x 43;
ok(!$auth->resolve_callback_state({state=>$state,provider=>'github'},'oauth2_state'),'provider substitution rejected');
my $resolved=$auth->resolve_callback_state({state=>$state,code=>'code',bind_to_profile=>1,session_id=>'evil',nonce=>'evil',return_url=>'https://evil.example'},'oauth2_state');
ok($resolved,'initiating browser resolves callback');
is($resolved->{bind_to_profile},0,'binding intent cannot be replaced');
is($resolved->{session_id},'trusted-session','binding session cannot be replaced');
is($resolved->{nonce},'trusted-nonce','nonce cannot be replaced');
is($resolved->{return_url},'/profile','return URL cannot be replaced');
ok(AuthBoundary::callback_verified($resolved),'internal guard reaches callback');
ok(!AuthBoundary::callback_verified({_callback_guard=>{}}),'request cannot forge internal guard');
ok(!$auth->resolve_callback_state({state=>$state},'oauth2_state'),'consumed state cannot be reused');
ok(!$auth->resolve_callback_state({},'oauth2_state'),'missing state rejected');

my $root=tempdir(CLEANUP=>1);
make_path("$root/public/shm","$root/scripts");
for ("$root/public/shm/healthcheck.cgi","$root/scripts/admin.cgi") {
    open my $fh,'>',$_ or die $!; print $fh "test"; close $fh;
}
my $router=method('server/app/bin/shm-server.pl','determine_script');
$router =~ s!/app/public_html!$root/public!g;
eval 'package RouterBoundary; use Cwd qw(realpath); my %doc_roots=("/shm/v1"=>"'.$root.'/public/shm/v1.cgi","/"=>"'.$root.'/public"); '.$router.method('server/app/bin/shm-server.pl','contained_cgi'); die $@ if $@;
for ('/shm/../../scripts/admin.cgi','/shm/%2e%2e/scripts/admin.cgi','/shm/..\\scripts/admin.cgi',"/shm/\x00.cgi") {
    my ($file)=RouterBoundary::determine_script($_);
    ok(!$file,'traversal or alternate encoding cannot execute CGI');
}
my ($file)=RouterBoundary::determine_script('/shm/healthcheck.cgi');
is($file,realpath("$root/public/shm/healthcheck.cgi"),'legitimate CGI remains available');
($file)=RouterBoundary::determine_script('/shm/v1/user');
like($file,qr{/shm/v1.cgi$},'API mapping remains available');
done_testing();
