use strict;
use warnings;
use Test::More;
{ package FakeApps;
  our $data;
  sub data_by_name { $data }
}
open my $fh, '<', 'server/app/lib/Core/Config.pm' or die $!;
my $source = do { local $/; <$fh> };
my ($method) = $source =~ /(sub api_data_by_apps \{.*?)\nsub delete/s;
eval "package FakeApps; $method"; die $@ if $@;
my $cfg = bless {}, 'FakeApps';
$FakeApps::data = {name=>'HAPP', description=>'Guide', token=>'secret', platforms=>[{name=>'Android', token=>'nested', steps=>['Install', {secret=>'bad'}]}]};
my $apps = $cfg->api_data_by_apps->{apps};
is($apps->[0]{name}, 'HAPP', 'single app config supported');
ok(!exists $apps->[0]{token}, 'secret omitted');
ok(!exists $apps->[0]{platforms}[0]{token}, 'nested secret omitted');
is_deeply($apps->[0]{platforms}[0]{steps}, ['Install'], 'only text instructions exposed');
$FakeApps::data = [{name=>'Visible'}, {name=>'Hidden', enabled=>0}];
is(scalar @{$cfg->api_data_by_apps->{apps}}, 1, 'disabled apps hidden');
$FakeApps::data = {happ=>{description=>'Guide'}};
is($cfg->api_data_by_apps->{apps}[0]{name}, 'happ', 'named app map supported');
$FakeApps::data = {};
is_deeply($cfg->api_data_by_apps->{apps}, [], 'empty config supported');
done_testing;