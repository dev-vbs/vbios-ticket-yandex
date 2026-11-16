use strict;
use warnings;
use Test::More;

# Exercise the production normalization without a running SHM database.
open my $fh, '<', 'server/app/lib/Core/Transport/Telegram.pm' or die $!;
my $source = do { local $/; <$fh> };
my ($method) = $source =~ /(sub _telegram_oidc_user_id \{.*?)\nsub web_auth/s;
die 'Identity helper not found' unless $method;
eval $method;
die $@ if $@;

is(_telegram_oidc_user_id({id => 1242405987, sub => '15605549976832490475'}), '1242405987', 'uses real Telegram id rather than OIDC subject');
is(_telegram_oidc_user_id({id => '1242405987'}), '1242405987', 'accepts decimal string');
is(_telegram_oidc_user_id({user_id => 1242405987}), '1242405987', 'accepts signed user_id alias');
is(_telegram_oidc_user_id({telegram_id => 1242405987}), '1242405987', 'accepts signed telegram_id alias');
ok(!defined(_telegram_oidc_user_id({sub => '15605549976832490475'})), 'never treats OIDC sub as Telegram id');
ok(!defined(_telegram_oidc_user_id({sub => '1242405987'})), 'even a short OIDC subject is not a Telegram id');
for my $value (0, -1, 'not-an-id', '15605549976832490475', {}, [], undef) {
    ok(!defined(_telegram_oidc_user_id({id => $value})), 'rejects invalid or missing id');
}
ok(!defined(_telegram_oidc_user_id({id => 'invalid', user_id => 1242405987})), 'does not conceal an invalid primary claim with an alias');
is(_telegram_oidc_user_id({id => '4503599627370495'}), '4503599627370495', 'accepts Bot API 52-bit boundary');
ok(!defined(_telegram_oidc_user_id({id => '4503599627370496'})), 'rejects value above Bot API range');
done_testing;
