use strict;
use warnings;
use utf8;
use Test::More;

{ package OidcReport;
  sub error { $_[0]{error} = $_[1] }
}
{ package OidcVerifier;
  our ($header, $claims, $keys, $fresh, $report, @requests, @attempts);
  sub decode_base64url { $_[0] }
  sub decode_json { $header }
  sub report { $report }
  sub telegram_oidc_client_id { '123' }
  sub telegram_oidc_jwks {
      my ($self, %args) = @_;
      push @requests, $args{refresh};
      return $args{refresh} ? $fresh : $keys;
  }
  sub jwt_decode {
      my %args = @_;
      push @attempts, $args{key}{kid};
      die 'signature mismatch' unless $args{key}{valid};
      die 'unexpected algorithms' unless join(',', @{$args{accepted_alg}}) eq 'RS256,ES256';
      return $claims;
  }
}
open my $fh, '<:encoding(UTF-8)', 'server/app/lib/Core/Transport/Telegram.pm' or die $!;
my $source = do { local $/; <$fh> };
my ($method) = $source =~ /(sub verify_telegram_oidc_id_token \{.*?)\nsub process_message/s;
eval "package OidcVerifier; $method";
die $@ if $@;
my $tg = bless {}, 'OidcVerifier';
sub reset_case {
    $OidcVerifier::header = {alg => 'RS256', kid => 'new'};
    $OidcVerifier::claims = {iss => 'https://oauth.telegram.org', aud => '123', exp => time+300, iat => time, nonce => 'nonce', id => 42};
    $OidcVerifier::keys = [{kid => 'new', alg => 'RS256', valid => 1}];
    $OidcVerifier::fresh = $OidcVerifier::keys;
    $OidcVerifier::report = bless {}, 'OidcReport';
    @OidcVerifier::requests = (); @OidcVerifier::attempts = ();
}
sub verify { $tg->verify_telegram_oidc_id_token(id_token => 'header.payload.signature', nonce => 'nonce') }
reset_case();
is(verify()->{id}, 42, 'verified profile is returned');
is_deeply(\@OidcVerifier::requests, [0], 'valid cached key needs no refresh');
reset_case();
$OidcVerifier::keys = [{kid => 'old', valid => 1}];
ok(verify(), 'rotated signing key is fetched');
is_deeply(\@OidcVerifier::requests, [0,1], 'one forced JWKS refresh');
is_deeply(\@OidcVerifier::attempts, ['new'], 'unrelated kid is never used');
for my $alg ('EdDSA', 'ES256K', 'none', '') {
    reset_case(); $OidcVerifier::header->{alg} = $alg;
    ok(!verify(), 'openid-only or unsafe algorithm is rejected');
    is(scalar @OidcVerifier::requests, 0, 'no key request for unsupported algorithm');
}
for my $claim ('iss', 'aud', 'exp', 'nonce') {
    reset_case(); $OidcVerifier::claims->{$claim} = $claim eq 'exp' ? time-10 : 'wrong';
    ok(!verify(), "invalid $claim is rejected");
}
reset_case();
$OidcVerifier::keys->[0]{valid} = 0;
ok(!verify(), 'invalid signature never authenticates');
done_testing;
