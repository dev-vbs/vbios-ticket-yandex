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
{
    package PublicMainBoundary;
    sub data_by_name { $_[0]{config} }
}
eval 'package PublicMainBoundary; '.method('server/app/lib/Core/Config.pm','api_data_by_main'); die $@ if $@;
my @landing_fields=qw(preview_label preview_title catalog_title catalog_description catalog_button plans_title plans_description plan_button geography_title geography_description cta_title cta_description);
my $main_config=bless {config=>{(map {($_=>'configured text')} @landing_fields), api_token=>'secret', private_data=>{password=>'secret'}, visual_steps=>[{title=>'Step',description=>'Details',api_token=>'secret'}]}}, 'PublicMainBoundary';
my $public_main=$main_config->api_data_by_main;
for my $field (@landing_fields) { is($public_main->{$field},'configured text',"public landing copy survives: $field"); }
ok(!exists($public_main->{api_token}) && !exists($public_main->{private_data}),'public main still excludes unlisted private fields');
ok(!exists($public_main->{visual_steps}[0]{api_token}),'nested landing copy excludes private fields');
$main_config->{config}{preview_title}={password=>'secret'};
my $invalid_main=$main_config->api_data_by_main;
ok(!exists($invalid_main->{preview_title}),'landing copy rejects nested objects');

{
    package StorefrontService;
    sub get { $_[0] }
    sub is_composite { $_[0]{is_composite} }
    sub cost_composite { 250 }
    package StorefrontCatalog;
    sub items { my ($self,%args)=@_; $self->{query}=\%args; return $self->{rows}; }
    package StorefrontConfig;
    sub srv { $_[0]{catalog} }
    sub data_by_name { +{addons=>[{service_id=>4}]} }
}
eval 'package StorefrontConfig; '.method('server/app/lib/Core/Config.pm','public_shm_plans'); die $@ if $@;
my $storefront=bless {catalog=>bless {rows=>[
    map {bless $_,'StorefrontService'}
    {service_id=>1,name=>'Public',cost=>150,period=>1,allow_to_order=>1,config=>{secret=>'hidden'}},
    {service_id=>2,name=>'Private',cost=>10,allow_to_order=>0},
    {service_id=>3,name=>'Deleted',cost=>10,allow_to_order=>1,deleted=>1},
    {service_id=>4,name=>'Addon',cost=>10,allow_to_order=>1},
    {service_id=>5,name=>'Composite',cost=>100,period=>0,allow_to_order=>1,is_composite=>1},
]},'StorefrontCatalog'},'StorefrontConfig';
my $plans=$storefront->public_shm_plans({});
is(scalar(@$plans),2,'storefront excludes private, deleted and addon services');
is($plans->[0]{price},'150.00 RUB','price comes from SHM');
is($plans->[1]{price},'250.00 RUB','composite price includes children');
is($plans->[1]{details},"\x{420}\x{430}\x{437}\x{43e}\x{432}\x{430}\x{44f} \x{43e}\x{43f}\x{43b}\x{430}\x{442}\x{430}",'zero period means one-time payment');
ok(!exists($plans->[0]{config}),'service config is never public');
$storefront->public_shm_plans({plan_service_ids=>[1,'bad',{},-1]});
is_deeply($storefront->{catalog}{query}{where},{allow_to_order=>1,deleted=>0,service_id=>{'-in'=>[1]}},'explicit IDs cannot bypass public service filters');
is_deeply($storefront->public_shm_plans({plan_service_ids=>[]}),[],'empty explicit selection hides all tariffs');
done_testing();
