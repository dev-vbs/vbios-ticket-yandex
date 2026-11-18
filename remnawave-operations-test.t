use strict;
use warnings;
use Test::More;
use lib 'server/app/lib';
use Core::Remnawave::Operations;
use URI;
use URI::QueryParam;
use URI::Escape qw(uri_escape_utf8);

# Exercise the real dispatcher without loading SHM's database/runtime.
open my $fh, '<', 'server/app/lib/Core/Remnawave.pm' or die $!;
my $source = do { local $/; <$fh> };
my ($method) = $source =~ /(sub operation \{.*?)(?=\nsub )/s;
die 'Dispatcher missing' unless $method;
{
    package DispatcherUser;
    sub is_admin { $_[0]{admin} }
    package Dispatcher;
    sub user { bless { admin => $_[0]{admin} }, 'DispatcherUser' }
    sub _request { my ($self, %args) = @_; $self->{request} = \%args; return \%args }
    sub uri_escape_utf8 { URI::Escape::uri_escape_utf8(@_) }
}
eval 'package Dispatcher; '.$method;
die $@ if $@;
my $client = bless { admin => 1 }, 'Dispatcher';
my $result = $client->operation(operation_id => 'NodesController_getNodes');
is($result->{path}, '/api/nodes', 'catalog resolves nodes route');
is($result->{method}, 'get', 'catalog resolves method');
my ($parameterized) = grep { $Core::Remnawave::Operations::OPERATIONS{$_}{path} =~ /\{/ } sort keys %Core::Remnawave::Operations::OPERATIONS;
my $op = $Core::Remnawave::Operations::OPERATIONS{$parameterized};
my %params = map { $_ => 'a/b ?&' } $op->{path} =~ /\{([^}]+)\}/g;
$result = $client->operation(operation_id => $parameterized, path_params => \%params, query => { search => 'one & two' }, body => { test => 1 });
like($result->{path}, qr/a%2Fb%20%3F%26/, 'path values cannot introduce URL delimiters');
is(URI->new($result->{path})->query_param('search'), 'one & two', 'query round trips');
is_deeply($result->{content}, { test => 1 }, 'JSON body forwarded');
eval { $client->operation(operation_id => $parameterized) };
like($@, qr/Missing path parameter/, 'missing required path rejected');
eval { $client->operation(operation_id => 'not-an-operation') };
like($@, qr/Unknown Remnawave operation/, 'unknown operation rejected');
$client->{admin} = 0;
delete $client->{request};
eval { $client->operation(operation_id => 'NodesController_getNodes') };
like($@, qr/Administrator required/, 'ordinary user denied');
ok(!exists $client->{request}, 'denied request never reaches transport');
done_testing;
