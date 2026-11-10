use strict;
use feature 'state';
use warnings;
use Test::More;
use MIME::Base64 qw(encode_base64);
use Digest::SHA qw(sha256);
use URI::Escape qw(uri_escape);

sub source_method {
    my ($file,$name,$next)=@_;
    open my $fh,'<:encoding(UTF-8)',$file or die $!;
    my $source=do {local $/;<$fh>};
    my ($method)=$source =~ /(sub \Q$name\E \{.*?)\nsub \Q$next\E/s;
    die "Missing $name" unless $method;
    return $method;
}
{
    package Core::Utils;
    our $cookie='cookie-session';
    sub get_cookies {$cookie}
    package Core::Auth::Base;
    sub save_browser_state {
        my ($self,$ctx)=@_;
        FakeTG::cache()->set_json('state_'.$ctx->{state},$ctx);
    }
    package FakeSession;
    sub user_id {2}
    sub delete {$_[0]{deleted}++;1}
    package FakeCache;
    sub set_json {my ($s,$key,$ctx)=@_;$s->{$key}=$ctx}
    package FakeReport;
    sub status {$_[0]{status}=$_[1]}
    sub error {$_[0]{error}=$_[1]}
    package FakeTG;
    our $valid=1;
    our $header;
    our $validated;
    our $session=bless {},'FakeSession';
    our $cache=bless {},'FakeCache';
    our $report=bless {},'FakeReport';
    sub parse_headers {return $header ? (HTTP_SESSION_ID=>$header) : ()}
    sub validate_session {my %args=@_;$validated=$args{session_id} || Core::Utils::get_cookies();return $valid ? $session : undef}
    sub report {$report}
    sub cache {$cache}
    sub random_base64url {state $id=0;'random'.++$id}
    sub sha256 {Digest::SHA::sha256($_[0])}
    sub encode_base64url {my $s=MIME::Base64::encode_base64($_[0],'');$s=~tr!+/!-_!;$s=~s/=+$//;$s}
    sub telegram_web_callback_url {'https://bill.example/shm/v1/telegram/web/callback'}
    sub telegram_oidc_client_id {'12345'}
    sub telegram_oidc_state_cache_key {'state_'.$_[1]}
    sub telegram_oauth_server {'https://oauth.telegram.org'}
}
my $init=source_method('server/app/lib/Core/Transport/Telegram.pm','telegram_oidc_init','telegram_oidc_start_redirect');
eval "package FakeTG; use v5.14; $init";die $@ if $@;
my $tg=bless {},'FakeTG';
my $ret=$tg->telegram_oidc_init(bind_to_profile=>1,profile=>'vBios_BOT');
ok($ret->{auth_url},'cookie-only OIDC binding can initialize');
is($FakeTG::validated,'cookie-session','binding validates the cookie session');
my $ctx=$FakeTG::cache->{'state_'.$ret->{state}};
is($ctx->{session_id},'cookie-session','HttpOnly session is preserved in server state');
is($ctx->{profile},'vBios_BOT','case-sensitive bot profile is preserved');
ok($ctx->{code_verifier} && $ctx->{nonce},'state preserves PKCE and nonce');
unlike($ret->{auth_url},qr/cookie-session|code_verifier=/,'session and PKCE verifier never go to provider URL');
$FakeTG::header='header-session';
$ret=$tg->telegram_oidc_init(bind_to_profile=>1);
is($FakeTG::cache->{'state_'.$ret->{state}}{session_id},'header-session','legacy header session also preserved');
$FakeTG::valid=0;
ok(!defined $tg->telegram_oidc_init(bind_to_profile=>1),'expired session cannot initialize binding');
is($FakeTG::report->{status},401,'expired binding returns unauthorized');
ok($tg->telegram_oidc_init(register_if_not_exists=>1),'anonymous login still initializes');

{
    package JSON;
    sub true () {1}
    sub false () {0}
    package FakeConfig;
    sub data_by_name {$_[0]{$_[1]}}
}
open my $cf,'<:encoding(UTF-8)','server/app/lib/Core/Config.pm' or die $!;
my $config_source=do {local $/;<$cf>};
my ($capabilities)=$config_source=~/(sub api_data_by_auth \{.*?\n\})/s;
eval "package FakeConfig; $capabilities";die $@ if $@;
my $cfg=bless {telegram=>{vBios_BOT=>{oidc_enabled=>1,oidc_client_id=>'id',oidc_client_secret=>'secret'}},oauth2=>{}},'FakeConfig';
my $options=$cfg->api_data_by_auth;
is($options->{telegram}{enabled},1,'OIDC aliases enable discovery');
is($options->{telegram}{profile},'vBios_BOT','discovery returns the correct bot profile');
unlike(join(' ',keys %{$options->{telegram}}),qr/secret|client_id/,'discovery does not publish credentials');
$cfg->{telegram}{vBios_BOT}{oidc_enabled}=0;
is($cfg->api_data_by_auth->{telegram}{enabled},0,'disabled OIDC is not offered');

# Exercise the production logout method with only the CGI serialization stubbed.
{
    package CGI::Cookie;
    sub new {my ($class,%args)=@_;bless \%args,$class}
    sub as_string {my $s=shift;return "$s->{'-name'}=$s->{'-value'}; HttpOnly; Expires=past"}
    package SHM;
    sub validate_session {return $FakeTG::session}
    package Core::Utils;
    sub parse_headers {return ()}
    package FakeUser;
    sub user_id {2}
    sub get_cookies {Core::Utils::get_cookies(@_)}
}
$INC{'CGI/Cookie.pm'}=1;
$ENV{SHM_TEST}=1;
my $logout=source_method('server/app/lib/Core/User.pm','logout_api','structure');
eval "package FakeUser; $logout";die $@ if $@;
my $out=(bless {},'FakeUser')->logout_api;
is($FakeTG::session->{deleted},1,'logout revokes the current session');
like($out->{session_cookie},qr/^session_id=;/,'logout clears the browser cookie');
like($out->{session_cookie},qr/HttpOnly/,'logout preserves HttpOnly semantics');

{
    package FakeOTP;
    sub get_enabled {0}
    package FakePasswordUser;
    sub is_password_auth_disabled {0}
    sub settings {return ()}
    sub gen_session {{id=>'new-password-session'}}
    sub set {1}
    package FakePasswordAuth;
    sub auth {bless {},'FakePasswordUser'}
    sub get_service {bless {},'FakeOTP'}
    sub now {'2026-11-11 12:00:00'}
    package Core::Utils;
    our $written_cookie;
    sub session_id_cookie {return 'cookie:'.$_[0]}
    sub print_header {my %args=@_;$written_cookie=$args{cookie}}
}
my $password_auth=source_method('server/app/lib/Core/User.pm','auth_api_safe','auth');
eval "package FakePasswordAuth; $password_auth";die $@ if $@;
delete $ENV{SHM_TEST};
my $password_result=(bless {},'FakePasswordAuth')->auth_api_safe(login=>'qa',password=>'qa');
is($password_result->{id},'new-password-session','password login retains API session response');
is($Core::Utils::written_cookie,'cookie:new-password-session','password login replaces a stale OIDC cookie on the server');

done_testing();
