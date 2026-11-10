package Core::Auth::Base;

use v5.14;
use parent 'Core::Base';
use Core::Base;
use Core::System::ServiceManager qw( get_service );
use URI::Escape qw( uri_escape );
use Core::Utils ();
use CGI::Cookie;
use Digest::SHA qw(sha256_hex);

my $CALLBACK_GUARD = {};
sub callback_verified {
    my $args = shift;
    return ref($args->{_callback_guard}) eq 'HASH' && $args->{_callback_guard} == $CALLBACK_GUARD;
}

sub save_browser_state {
    my ($self, $ctx, $prefix, $ttl) = @_;
    $ttl = 600 unless defined $ttl && $ttl =~ /^\d+$/ && $ttl > 0 && $ttl <= 600;
    my $secret = Core::Utils::random_base64url(32);
    $ctx->{browser_hash} = sha256_hex($secret);
    cache->set_json($prefix . '_' . $ctx->{state}, $ctx, $ttl);
    Core::Utils::queue_response_cookie(CGI::Cookie->new(
        -name => 'auth_state_' . $ctx->{state}, -value => $secret,
        -path => '/shm/v1', -httponly => 1, -samesite => 'Lax',
        -secure => Core::Utils::public_origin() =~ /^https:/ ? 1 : 0,
        -expires => '+10m',
    ));
}

sub provider_names {
    my $self = shift;
    my @providers = @_ ? @_ : qw(google yandex github);
    return sort grep { $self->can("${_}_config") } @providers;
}

sub provider_config {
    my $self = shift;
    my $provider = shift || return undef;
    my $method = "${provider}_config";
    return $self->can($method) ? $self->$method() : undef;
}

sub normalize_claims {
    my $self = shift;
    my $provider = shift;
    my $raw = shift || {};
    my $method = "${provider}_normalize_claims";
    return $self->can($method) ? $self->$method($raw) : {};
}

sub provider_fields {
    my $self = shift;
    my $provider = shift;
    my $cfg = $self->can('oauth2_config') ? $self->oauth2_config($provider) : {};
    $cfg = $self->can('oidc_config') ? $self->oidc_config($provider) : $cfg if ref($cfg) ne 'HASH';

    my $fields = $cfg->{fields};
    return ref $fields eq 'ARRAY' && @$fields ? $fields : ['email'];
}

sub provider_scope {
    my $self = shift;
    my $provider = shift;

    my $pcfg = $self->provider_config($provider) || return '';
    my %requested = map { $_ => 1 } @{ $self->provider_fields($provider) };
    $requested{email} = 1; # email always required

    my @scopes = ( $pcfg->{base_scope} || () );
    for my $field ( sort keys %requested ) {
        push @scopes, $pcfg->{field_scopes}{$field} if $pcfg->{field_scopes}{$field};
    }
    return join(' ', grep { length } @scopes);
}

sub http_transport {
    my $self = shift;
    return $self->{http_transport} ||= get_service('Transport::Http');
}

sub callback_url {
    my $self = shift;
    my $provider = shift;
    my $prefix = shift || 'oauth2';

    my $origin = Core::Utils::public_origin() || return undef;
    return sprintf('%s/shm/v1/%s/callback/%s', $origin, $prefix, $provider);
}

sub auth_state_cache_key {
    my $self = shift;
    my $state = shift;
    my $prefix = shift || 'auth_state';
    return sprintf('%s_%s', $prefix, $state || '');
}

sub resolve_callback_state {
    my $self = shift;
    my $args = shift || {};
    my $prefix = shift || 'auth_state';

    my $state = $args->{state} || '';
    return undef unless $state =~ /\A[A-Za-z0-9_-]{32,128}\z/;
    my $key = $prefix . '_' . $state;
    my $ctx = cache->get_json($key);
    return undef unless ref $ctx eq 'HASH' && ($ctx->{state} || '') eq $state;
    my $secret = Core::Utils::get_cookies('auth_state_' . $state) || '';
    return undef unless $secret && ($ctx->{browser_hash} || '') eq sha256_hex($secret);
    return undef if $args->{provider} && $ctx->{provider} && $args->{provider} ne $ctx->{provider};
    cache->delete($key);
    Core::Utils::queue_response_cookie(CGI::Cookie->new(
        -name => 'auth_state_' . $state, -value => '', -path => '/shm/v1',
        -httponly => 1, -samesite => 'Lax', -expires => '-1d',
        -secure => Core::Utils::public_origin() =~ /^https:/ ? 1 : 0,
    ));
    return {
        %$ctx, code => $args->{code}, id_token => $args->{id_token},
        expected_state => $ctx->{state}, _callback_guard => $CALLBACK_GUARD,
    };
}

sub build_callback_redirect_url {
    my $self = shift;
    my $result = shift;
    my $return_url = shift;
    my $default_error = shift || 'Authentication failed';
    my $status_key = shift || 'oidc_status';

    return undef unless Core::Utils::safe_return_url($return_url);

    my %query;
    if ( ref $result eq 'HASH' && $result->{session_id} ) {
        %query = ( $status_key => 'success' );
    } elsif ( ref $result eq 'HASH' && ( $result->{error} || '' ) =~ /already linked/i ) {
        %query = ( $status_key => 'already_exists', error => $result->{error} );
    } elsif ( ref $result eq 'HASH' && ( $result->{error} || '' ) =~ /Already\s+bound/i ) {
        %query = ( $status_key => 'already_bound', error => $result->{error} );
    } elsif ( ref $result eq 'HASH' && ( $result->{msg} || '' ) =~ /Successfully\s+bound/i ) {
        %query = ( $status_key => 'success', msg => $result->{msg} );
    } elsif ( ref $result eq 'HASH' && $result->{error} ) {
        %query = ( $status_key => 'error', error => $result->{error} );
    } else {
        %query = ( $status_key => 'error', error => $default_error );
    }

    my $sep = ( $return_url =~ /\?/ ) ? '&' : '?';
    return $return_url . $sep . join('&', map { uri_escape($_) . '=' . uri_escape($query{$_}) } sort keys %query);
}

1;
