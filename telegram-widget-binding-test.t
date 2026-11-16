use strict;
use warnings;
use Test::More;

{ package Core::Auth::Base;
  our $context;
  sub resolve_callback_state { my $result = $context; $context = undef; return $result }
}
{ package LocalReport;
  sub status { $_[0]{status} = $_[1] }
  sub error { $_[0]{error} = $_[1] }
}
my $report = bless {}, 'LocalReport';
sub report { $report }
open my $fh, '<', 'server/app/lib/Core/Transport/Telegram.pm' or die $!;
my $source = do { local $/; <$fh> };
my ($body) = $source =~ /sub web_auth \{(.*?)# Widget linking/s;
die 'Binding preparation not found' unless $body;
eval 'sub prepare {' . $body . 'return \%args; }';
die $@ if $@;

$Core::Auth::Base::context = {state=>'one-use', widget_binding=>1, bind_to_profile=>1, session_id=>'server-session', profile=>'real-bot'};
my $result = prepare(undef, state=>'one-use', bind_to_profile=>1, id=>12345, hash=>'signed-hash', session_id=>'untrusted-session', profile=>'wrong-bot');
is($result->{session_id}, 'server-session', 'binding session comes from server state');
is($result->{profile}, 'real-bot', 'bot profile comes from server state');
is($result->{id}, 12345, 'signed widget identity is preserved for subsequent HMAC verification');
is($result->{hash}, 'signed-hash', 'widget signature is preserved');
ok(!defined prepare(undef, state=>'one-use', bind_to_profile=>1, id=>12345), 'consumed state is rejected');
is($report->{status}, 400, 'invalid state reports an error');
$Core::Auth::Base::context = {bind_to_profile=>1, widget_binding=>0};
ok(!defined prepare(undef, state=>'oidc-only', bind_to_profile=>1), 'OIDC state cannot be used as widget binding state');
done_testing;
