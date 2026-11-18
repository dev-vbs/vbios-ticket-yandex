use strict;
use warnings;
use Test::More;
use JSON::PP;
use lib 'server/app/lib';
our (%services,$paid,%rows,@requests,$fail_patch,$lock_available,$configured_addons,%ledger);
BEGIN {
    package Core::System::ServiceManager;
    use Exporter 'import';
    our @EXPORT_OK=qw(get_service);
    sub get_service { $main::services{$_[0]} }
    $INC{'Core/System/ServiceManager.pm'}=1;
    package Core::Utils;
    use Exporter 'import';
    our @EXPORT_OK=qw(encode_json decode_json);
    sub encode_json { JSON::PP::encode_json($_[0]) }
    sub decode_json { JSON::PP::decode_json($_[0]) }
    $INC{'Core/Utils.pm'}=1;
}
use Core::Remnawave::Cabinet;
{
    package FakeReport;
    sub status { $_[0]{status}=$_[1] }
    sub add_error { push @{$_[0]{errors}},$_[1] }
    package FakeConfig;
    sub data_by_name { {addon_signing_key=>'a' x 40,addons=>$main::configured_addons || []} }
    package FakeOrder;
    sub is_paid { $main::paid }
    package FakeStorage;
    sub save { $_[0]{$_[1]}=$_[2] }
    sub read { $_[0]{$_[2]} }
    sub id { $_[0]{active}=$_[1]; $_[0] }
    sub reload { $_[0] }
    sub data { $_[0]{$_[0]{active}} }
    package FakeCache;
    sub get_json { $_[0]{$_[1]} }
    sub set_json { $_[0]{$_[1]}=$_[2] }
    sub delete { delete $_[0]{$_[1]} }
    sub increment { ++$_[0]{$_[1]} }
    package FakeDB;
    sub selectrow_array {
        my ($self,$sql,$attr,@a)=@_;
        if ($sql =~ /GET_LOCK/) { die 'MySQL lock name too long' if length($a[0])>64; return $main::lock_available; }
        if ($sql =~ /SELECT order_id FROM remnawave_addon_ledger/) {
            my ($uid,$target,$order)=@a;
            my ($pending)=grep { $_->{user_id}==$uid && $_->{target_id}==$target && $_->{order_id}!=$order && !$_->{applied} } values %main::ledger;
            return $pending ? $pending->{order_id} : undef;
        }
        return 1;
    }
    sub selectrow_hashref { $main::ledger{$_[3]} }
    sub do {
        my ($self,$sql,$attr,@a)=@_;
        if ($sql =~ /^INSERT INTO remnawave_addon_ledger/) {
            my ($id,$uid,$target,$signature,$desired)=@a;
            die 'Wrong owner' unless $uid==7;
            $main::ledger{$id}={order_id=>$id,user_id=>$uid,target_id=>$target,signature=>$signature,desired=>$desired,applied=>0};
        } elsif ($sql =~ /^UPDATE remnawave_addon_ledger/) { $main::ledger{$a[0]}{applied}=1; }
        else { die 'Unexpected database write'; }
        return 1;
    }
    package CabinetClient;
    our @ISA=('Core::Remnawave');
    sub user_id { 7 }
    sub _cfg { {url=>'https://panel.example',api_token=>'secret',storage_prefix=>'vpn_mrzb_'} }
    sub cache { $_[0]{cache} }
    sub dbh { bless {},'FakeDB' }
    sub srv { $_[0]{storage} ||= bless {},'FakeStorage' }
    sub _owned { $main::rows{$_[2]} }
    sub _owned_or_error { $main::rows{$_[1]} || die 'Not owned' }
    sub _remna_id { 123 }
    sub _api_error { undef }
    sub _request {
        my ($self,%a)=@_;push @main::requests,\%a;
        my $p=$a{path};
        die 'transport failed' if $self->{fail_all};
        if ($p =~ /actions\/revoke$/) {
            $self->{user}={id=>123,subscriptionUrl=>'https://access.example/new',shortUuid=>'new-short'};
            return {response=>$self->{user}};
        }
        return {response=>{userId=>123,activeNodes=>[{uuid=>'allowed',nodeName=>'Berlin',countryCode=>'DE',activeSquads=>['private']}]}} if $p =~ /accessible-nodes/;
        return {response=>[{uuid=>'allowed',isConnected=>1,address=>'private-ip',port=>1234},{uuid=>'forbidden',isConnected=>1}]} if $p eq '/api/nodes';
        return {response=>{categories=>['2026-11-17'],sparklineData=>[1048576],topNodes=>[{uuid=>'private'}]}} if $p =~ /bandwidth-stats/;
        return {response=>{records=>[{userId=>123,requestAt=>'2026-11-18T12:00:00Z',userAgent=>'Example',requestIp=>'private-ip',srrRuleName=>'private-rule'}]}} if $p =~ /subscription-request-history/;
        return {response=>{devices=>$self->{devices} || [{hwid=>'phone'}]}} if $p =~ /hwid/;
        if ($p eq '/api/users' && $a{method} eq 'patch') {
            die 'patch failed' if $main::fail_patch;
            $self->{user}={%{$self->{user} || {}},%{$a{content}}};
            return {response=>$self->{user}};
        }
        return {response=>$self->{user} || {id=>123,status=>'ACTIVE',trafficLimitBytes=>1000,userTraffic=>{usedTrafficBytes=>850},subscriptionUrl=>'private-url'}} if $p eq '/api/users/123';
        die "Unexpected request $p";
    }
}
$services{report}=bless {},'FakeReport';
$services{config}=bless {},'FakeConfig';
$services{USObject}=bless {},'FakeOrder';
my $client=bless {cache=>bless({},'FakeCache')},'CabinetClient';
$rows{10}={user_service_id=>10,user_id=>7,service_id=>2,status=>'ACTIVE',settings=>'{}'};
my $r=$client->api_cabinet(user_service_id=>10,section=>'nodes');
is_deeply($r,{nodes=>[{name=>'Berlin',country=>'DE',status=>'online'}]},'only allowed nodes and public status fields');
my $count=@requests;
$client->api_cabinet(user_service_id=>10,section=>'nodes');
is(scalar @requests,$count,'nodes cached');
$r=$client->api_cabinet(user_service_id=>10,section=>'traffic');
is_deeply($r->{bytes},[1048576],'daily bandwidth values');
ok(!exists $r->{topNodes},'traffic topology omitted');
$r=$client->api_cabinet(user_service_id=>10,section=>'history');
is_deeply($r->{records},[{at=>'2026-11-18T12:00:00Z',client=>'Example',type=>undef}],'subscription history privacy allowlist');
$r=$client->api_cabinet(user_service_id=>10,section=>'diagnostics');
is($r->{notices}[0]{kind},'traffic','quota notice at 80 percent');
ok(!grep({$_->{kind} eq 'device'} @{$r->{notices}}),'first visit establishes device baseline');
ok(!exists($r->{subscriptionUrl}),'diagnostics exclude secret subscription');
$client->_cabinet_invalidate($rows{10},123);
$client->{devices}=[{hwid=>'phone'},{hwid=>'laptop'}];
$r=$client->api_cabinet(user_service_id=>10,section=>'diagnostics');
ok(grep({$_->{kind} eq 'device'} @{$r->{notices}}),'new device detected relative to baseline');
$count=@requests;
ok(!defined $client->api_cabinet(user_service_id=>999,section=>'nodes'),'foreign service rejected');
is(scalar @requests,$count,'foreign service never reaches upstream');
ok(!defined $client->api_cabinet(user_service_id=>10,section=>'admin'),'unknown section rejected');
is(scalar @requests,$count,'unknown section never reaches upstream');

# Paid fulfillment uses the real implementation with DB/transport fixtures.
my $definition=JSON::PP::encode_json({type=>'traffic',amount=>500});
my $signature=$client->_addon_signature(7,10,20,$definition);
sub order_settings { JSON::PP::encode_json({remna_addon=>{target=>10,definition=>$definition,signature=>$signature}}) }
$rows{11}={user_service_id=>11,user_id=>7,service_id=>20,settings=>order_settings()};
$lock_available=1;
$paid=0;
eval { $client->fulfill_addon(order_id=>11) };
like($@,qr/Payment required/,'unpaid order cannot grant an addon');
$paid=1;
my $bad=JSON::PP::decode_json($rows{11}{settings});$bad->{remna_addon}{target}=99;
$rows{11}{settings}=JSON::PP::encode_json($bad);
eval { $client->fulfill_addon(order_id=>11) };
like($@,qr/Invalid addon signature/,'tampered target rejected');
$rows{11}{settings}=order_settings();
$lock_available=0;
eval { $client->fulfill_addon(order_id=>11) };
like($@,qr/busy/,'cannot grant without exclusive target lock');
$lock_available=1;
$fail_patch=1;
eval { $client->fulfill_addon(order_id=>11) };
like($@,qr/patch failed/,'upstream failure propagates to local task');
my $ledger=$ledger{11};
is(JSON::PP::decode_json($ledger->{desired})->{trafficLimitBytes},1500,'absolute desired limit stored before external write');
ok(!$ledger->{applied},'failed write not marked applied');
# Simulate API committing but its HTTP response being lost.
$client->{user}={id=>123,trafficLimitBytes=>1500};
$fail_patch=0;
$r=$client->fulfill_addon(order_id=>11);
ok($r->{ok},'retry completes paid fulfillment');
is($client->{user}{trafficLimitBytes},1500,'retry does not grant duplicate traffic');
$count=scalar grep { ($_->{method} || '') eq 'patch' } @requests;
$r=$client->fulfill_addon(order_id=>11);
ok($r->{already_applied},'completed order recognized');
is(scalar(grep { ($_->{method} || '') eq 'patch' } @requests),$count,'completed order sends no further mutation');
ok($ledger{11}{applied},'independent ledger confirms applied order');
is($rows{10}{settings},'{}','fulfillment never writes the locked user_services rows');

$ledger{99}={order_id=>99,user_id=>7,target_id=>10,applied=>0};
$rows{12}={user_service_id=>12,user_id=>7,service_id=>20,settings=>order_settings()};
eval { $client->fulfill_addon(order_id=>12) };
like($@,qr/Another addon is pending/,'uncertain previous write blocks later increments');
$rows{10}{status}='BLOCK';
eval { $client->fulfill_addon(order_id=>12) };
like($@,qr/Active target required/,'blocked target cannot receive a paid grant');

# Compile every method of the existing module as well, with infrastructure imports
# stripped. Runtime adapters remain covered by the SHM container integration test.
open my $fh,'<','server/app/lib/Core/Remnawave.pm' or die $!;
my $source=do {local $/; <$fh>};
$source =~ s/^package Core::Remnawave;/package CompileRemnawave;/m;
$source =~ s/^use [^;]+;//mg;
my $compiled=eval $source;
ok($compiled,'complete Remnawave source compiles with infrastructure stubbed') or diag $@;

my ($binding)=$source =~ /(sub _remna_id \{.*?)(?=\nsub )/s;
{
    package BindingClient;
    use Digest::SHA qw(sha256_hex);
    use URI::Escape qw(uri_escape_utf8);
    sub _cfg { {url=>'https://panel.example',api_token=>'secret',name_prefix=>'user_'} }
    sub user_id { 7 }
    sub cache { $_[0]{cache} }
    sub _request { $_[0]{last_path}=$_[2]; return {response=>{id=>123,username=>$_[0]{wrong} ? 'other' : 'user_10'}} }
}
eval 'package BindingClient; '.$binding;
die $@ if $@;
my $bound=bless {cache=>bless({},'FakeCache')},'BindingClient';
is($bound->_remna_id($rows{10}),123,'binding resolves numeric id by server-generated username');
like($bound->{last_path},qr{/by-username/user_10$},'binding uses owned service id');
$bound->{cache}=bless {},'FakeCache';$bound->{wrong}=1;
eval {$bound->_remna_id($rows{10})};
like($@,qr/Unexpected Remnawave username/,'mismatched upstream account rejected');

$r=$client->api_rotate_subscription(user_service_id=>10);
ok($r->{ok},'rotation confirmed');
is($r->{url},'https://access.example/new','new subscription returned');
my ($revoke)=grep { $_->{path} =~ /actions\/revoke$/ } @requests;
is(JSON::PP::encode_json($revoke->{content}),'{"revokeOnlyPasswords":false}','revoke rotates subscription and credentials together');
is($client->srv('storage')->read(name=>'vpn_mrzb_10')->{subscriptionUrl},$r->{url},'canonical storage updated to replacement URL');
ok(!defined $client->api_rotate_subscription(user_service_id=>999),'foreign subscription cannot be revoked');
$client->api_rotate_subscription(user_service_id=>10);
$client->api_rotate_subscription(user_service_id=>10);
$count=scalar grep { $_->{path} =~ /actions\/revoke$/ } @requests;
ok(!defined $client->api_rotate_subscription(user_service_id=>10),'fourth rotation is rate limited');
is(scalar(grep { $_->{path} =~ /actions\/revoke$/ } @requests),$count,'rate limited revoke never reaches upstream');
$r=$client->api_subscription_access(user_service_id=>10);
is($r->{url},'https://access.example/new','uncertain revoke can recover current link without another mutation');

$rows{10}{status}='ACTIVE';$rows{10}{settings}='{}';delete $ledger{99};
$client->{user}={id=>123,hwidDeviceLimit=>3,trafficLimitBytes=>1500,activeInternalSquads=>[{uuid=>'11111111-1111-4111-8111-111111111111'}]};
$definition=JSON::PP::encode_json({type=>'devices',amount=>2});
$signature=$client->_addon_signature(7,10,20,$definition);
$rows{13}={user_service_id=>13,user_id=>7,service_id=>20,settings=>order_settings()};
ok($client->fulfill_addon(order_id=>13)->{ok},'paid device expansion applied');
is($client->{user}{hwidDeviceLimit},5,'device count increased by purchased amount');
$definition=JSON::PP::encode_json({type=>'locations',squad_uuid=>'22222222-2222-4222-8222-222222222222'});
$signature=$client->_addon_signature(7,10,20,$definition);
$rows{14}={user_service_id=>14,user_id=>7,service_id=>20,settings=>order_settings()};
ok($client->fulfill_addon(order_id=>14)->{ok},'paid location expansion applied');
is_deeply($client->{user}{activeInternalSquads},['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222'],'adding a location preserves previous squads');

open $fh,'<','server/app/lib/Core/Service.pm' or die $!;
my $service_source=do {local $/; <$fh>};
my ($catalog)=$service_source =~ /(sub api_price_list \{.*?)(?=\nsub )/s;
my ($is_addon)=$service_source =~ /(sub is_remna_addon \{.*?)(?=\n#)/s;
{
    package CatalogClient;
    sub get_service { $main::services{$_[0]} }
    sub id { 20 }
    sub price_list { ({service_id=>2},{service_id=>20}) }
}
eval 'package CatalogClient; '.$catalog.$is_addon;
die $@ if $@;
$configured_addons=[{service_id=>20}];
my $catalog_client=bless {},'CatalogClient';
my @catalog=$catalog_client->api_price_list;
is_deeply(\@catalog,[{service_id=>2}],'addons excluded from normal tariff catalog');
ok($catalog_client->is_remna_addon,'configured addon service identified');

open $fh,'<','server/app/lib/Core/USObject.pm' or die $!;
my $us_source=do {local $/; <$fh>};
my ($safe_order)=$us_source =~ /(sub create_for_api_safe \{.*?)(?=\nsub )/s;
{
    package SafeOrderClient;
    sub get_service { $main::services{$_[0]} }
    sub report { $main::services{report} }
    sub create_for_api { die 'Unsafe generic creation reached' }
}
$services{service}=$catalog_client;
eval 'package SafeOrderClient; '.$safe_order;
die $@ if $@;
ok(!defined(bless({},'SafeOrderClient')->create_for_api_safe(service_id=>20)),'direct generic addon order rejected before billing');

done_testing;
