use strict;
use warnings;
use Test::More;
{
    package MonitorTest;
    use Digest::SHA qw(sha256_hex);
    use JSON::PP qw(encode_json decode_json);
    sub time { 6000 }
    sub is_ipv4 { 0 }
    sub is_ipv6 { 0 }
    sub _tcp_latency_ms { 12 }
    sub get_service { bless {}, 'MonitorConfig' }
    sub cache { $_[0]{cache} }
    sub _request { +{response=>[{uuid=>'abc',address=>'example.com',port=>443,isConnected=>1}]} }
    package MonitorConfig;
    sub data_by_name { $_[1] eq 'main' ? {monitor_enabled=>1,monitor_nodes=>[{uuid=>'abc',title=>'Node'}]} : {url=>'https://example.com'} }
    package MonitorCache;
    sub get_json { undef }
    sub set_json { }
    sub redis { $_[0]{redis} }
    package MonitorRedis;
    sub hset { $_[0]{$_[1]}{$_[2]}=$_[3] }
    sub expire { }
    sub hgetall { %{$_[0]{$_[1]} || {}} }
    sub hdel { my ($self,$key,@fields)=@_; delete @{$self->{$key}}{@fields}; }
}
open my $fh, '<:encoding(UTF-8)', 'server/app/lib/Core/Remnawave.pm' or die $!;
my $source=do {local $/; <$fh>};
for my $name (qw(_monitor_uuid api_monitor)) {
    my ($body)=$source=~/(sub \Q$name\E \{.*?)(?=\nsub )/s;
    $body =~ s/\btime\(\)/MonitorTest::time()/g;
    eval 'package MonitorTest; '.$body; die $@ if $@;
}
my $redis=bless {},'MonitorRedis';
my $monitor=bless {cache=>bless({redis=>$redis},'MonitorCache')},'MonitorTest';
my $first=$monitor->api_monitor;
is($first->{nodes}[0]{history}[0]{status},'online','successful TCP and connected panel recorded');
is($first->{nodes}[0]{history}[0]{at},6000,'history uses minute buckets');
my ($key)=keys %$redis;
$redis->{$key}{2400}=JSON::PP::encode_json({at=>2400,status=>'offline'});
$redis->{$key}{5940}=JSON::PP::encode_json({at=>5940,status=>'offline'});
my $second=$monitor->api_monitor;
is(scalar @{$second->{nodes}[0]{history}},2,'repeat request replaces same minute, preserves earlier sample');
is($second->{nodes}[0]{history}[0]{status},'offline','prior failure preserved');
ok(!exists($redis->{$key}{2400}),'old samples pruned');
ok(!exists($redis->{$key}{5880}),'missing minutes are not fabricated');
{
    no warnings 'redefine';
    local *MonitorCache::redis = sub { die 'Redis unavailable' };
    my $result=$monitor->api_monitor;
    is(scalar @{$result->{nodes}[0]{history}},1,'Redis outage preserves current result');
}
{
    no warnings 'redefine';
    local *MonitorRedis::hgetall = sub { () };
    my $result=$monitor->api_monitor;
    is(scalar @{$result->{nodes}[0]{history}},1,'silent Redis fallback also preserves current sample');
}
done_testing();
