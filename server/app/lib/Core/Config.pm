package Core::Config;
use v5.14;

use parent 'Core::Base';
use Core::Base;

our $config;
our $session_config;
require 'shm.conf';

use Core::Utils qw(
    decode_json
);
use JSON qw//;

sub table { return 'config' };

sub structure {
    return {
        key => {
            type => 'text',
            key => 1,
            title => 'ключ',
        },
        value => {
            type => 'json',
            required => 1,
            title => 'значение',
        },
    }
}

# Кастомное имя сервиса. Не используем user_id в имени, так как сервис не зависит от пользователя
sub _id {
    my $self = shift;
    my %args = @_;

    if ( $args{key} ) {
        $self->{key} = $args{key};
        return "key=$self->{key}";
    }
    return undef;
}

sub table_allow_insert_key { return 1 };

sub validate_attributes {
    my $self = shift;
    my $method = shift;
    my %args = @_;

    my $report = get_service('report');

    unless ( $args{key} || $args{value} ) {
        $report->add_error('KeyOrValueNotPresent');
    }

    if ( $args{key} =~/^_/ && not $self->user->authenticated->is_admin ) {
        $report->add_error('KeyProhibited');
    }

    return $report->is_success;
}

sub file {
    my $self = shift;

    return {
        config => $config,
        session => $session_config,
    };
}

sub local {
    my $self = shift;
    my $section = shift;
    my $new_data = shift;

    if ( $new_data ) {
        $self->{config}->{local}->{ $section } = $new_data;
    }

    return $self->{config}->{local} unless $section;
    return $self->{config}->{local}->{ $section };
}

sub api_data_by_name {
    my $self = shift;
    my %args = (
        key => undef,
        @_,
    );

    return $self->data_by_name( $args{key} );
}

sub data_by_name {
    my $self = shift;
    my $key = shift || return $self->all_data_by_name();

    my $config = $self->id( $key );
    return $config ? $config->get_data : {};
}

sub all_data_by_name {
    my $self = shift;
    my $key = shift;

    my @list = $self->list( where => {
        $key ? ( key => $key ) : (),
    });

    my %ret = map{ $_->{key} => $_->{value} } @list;

    if ( $key ) {
        for ( keys %{ $ret{ $key } } ) {
            $ret{ $_ } = delete $ret{ $key }->{ $_ };
        }
        delete $ret{ $key };
    }

    return \%ret || {};
}

sub api_data_by_company { shift->data_by_name('company') };

# This endpoint is anonymous. Never return the raw configuration object.
sub api_data_by_main {
    my $self = shift;
    my $cfg = $self->data_by_name('main');
    $cfg = {} unless ref($cfg) eq 'HASH';
    my %public;
    for my $field (qw(name description logo_url support_url intro title accent_title primary_button login_button secondary_button compatibility visual_caption benefits_title benefits_description connection_title faq_title faq_description nav_benefits nav_connection nav_questions support_label login_title register_title monitor_enabled)) {
        $public{$field} = $cfg->{$field} if defined($cfg->{$field}) && !ref($cfg->{$field});
    }
    for my $field (qw(visual_steps benefits steps faq documents monitor_nodes)) {
        next unless ref($cfg->{$field}) eq 'ARRAY';
        my @items;
        for my $item (@{$cfg->{$field}}) {
            next unless ref($item) eq 'HASH';
            my %entry = map { defined($item->{$_}) && !ref($item->{$_}) ? ($_ => $item->{$_}) : () }
                ($field eq 'documents' ? qw(label url) : $field eq 'monitor_nodes' ? qw(uuid title description ping_ip ping_port ping_url) : qw(title description));
            push @items, \%entry;
            last if @items >= 20;
        }
        $public{$field} = \@items;
    }
    return \%public;
}

sub api_data_by_apps {
    my $self = shift;
    my $cfg = $self->data_by_name('apps') || {};
    my @apps = ref($cfg) eq 'ARRAY' ? @$cfg
        : ref($cfg) eq 'HASH' && exists($cfg->{name}) ? ($cfg)
        : ref($cfg) eq 'HASH' ? map { ref($cfg->{$_}) eq 'HASH' ? +{ name => $_, %{$cfg->{$_}} } : () } sort keys %$cfg
        : ();
    my @result;
    for my $app (@apps) {
        next unless ref($app) eq 'HASH' && ($app->{enabled} // 1);
        my %public;
        for my $field (qw(name description docs download_url)) {
            $public{$field} = $app->{$field} if defined($app->{$field}) && !ref($app->{$field});
        }
        next unless $public{name};
        my @platforms;
        for my $platform (@{ref($app->{platforms}) eq 'ARRAY' ? $app->{platforms} : []}) {
            next unless ref($platform) eq 'HASH';
            my %item = map { defined($platform->{$_}) && !ref($platform->{$_}) ? ($_ => $platform->{$_}) : () } qw(name download_url);
            $item{steps} = [grep { defined($_) && !ref($_) } @{ref($platform->{steps}) eq 'ARRAY' ? $platform->{steps} : []}];
            push @platforms, \%item if $item{name};
        }
        $public{platforms} = \@platforms;
        push @result, \%public;
    }
    return { apps => \@result };
}

sub delete {
    my $self = shift;
    my %args = @_;

    if ( $self->id =~/^_/ ) {
        report->add_error('KeyProhibited');
        return undef;
    }

    return $self->SUPER::delete();
}

sub get_data { shift->get->{value} || {} };

sub list_for_api {
    my $self = shift;
    my %args = (
        key => undef,
        filter => {},
        @_,
    );

    my $filter_by_value = delete $args{filter}->{value};

    if ( $args{key} ) {
        $args{where}->{key} = $args{key};
    }
    elsif ( $args{filter}->{key} ) {
        $args{where}->{key} = delete $args{filter}->{key};
    }
    $args{where}->{value} = { '-like' => $filter_by_value } if $filter_by_value;

    return $self->SUPER::list_for_api( %args );
}

sub api_set_value {
    my $self = shift;
    my %args = (
        key => undef,
        @_,
    );

    return undef unless $self->id;

    my $config = $self->id( $args{key} );
    unless ( $config ) {
        report->add_error( 'key not found' );
        return undef;
    }

    if ( my $new_values = decode_json $args{ POSTDATA } ) {
        my $old_values = $self->get;
        $config->set_value( $new_values );

        my $method = sprintf("updated_%s", $args{key} );
        if ( $self->can( $method ) ) {
            $self->$method( old_values => $old_values );
        }
    }

    return scalar $self->get;
}

sub api_delete_value {
    my $self = shift;
    my %args = (
        key => undef,
        value => undef,
        @_,
    );

    return undef unless $self->id;

    my $config = $self->id( $args{key} );
    unless ( $config ) {
        report->add_error( 'key not found' );
        return undef;
    }

    my $key = $self->get;
    my $old_values = $key->{value};

    delete $old_values->{ $args{value} };
    $config->set_value( $old_values );

    return scalar $self->get;
}

sub set_value {
    my $self = shift;
    my $new_data = shift;

    return $self->set_json('value', $new_data );
}

sub updated_pay_systems {
    my $self = shift;
    my %args = (
        old_values => undef,
        @_,
    );

    $self->srv('Cloud::Jobs')->job_download_all_paystems();
}

sub version_info {
    my $self = shift;
    my $report = get_service('report');

    my $version_file = "$ENV{SHM_ROOT_DIR}/version.json";

    unless ( -f $version_file ) {
        $report->add_error('VersionFileNotFound');
        return undef;
    }

    my $version_data = decode_json( Core::Utils::read_file( $version_file ) );

    return $version_data;
}

sub api_data_by_auth {
    my $self = shift;
    my $billing = $self->data_by_name('billing') || {};
    my $oauth2 = $self->data_by_name('oauth2') || {};
    my $telegram = $self->data_by_name('telegram') || {};
    my $passkey = $self->data_by_name('passkey') || {};

    my %providers;
    for my $provider ( keys %$oauth2 ) {
        my $provider_cfg = $oauth2->{$provider} || {};
        if ( $provider_cfg->{enabled} == JSON::true ) {
            $providers{$provider} = {
                enabled => ( $provider_cfg->{client_id} && $provider_cfg->{client_secret} ) ? JSON::true : JSON::false,
            };
        }
    }

    my $telegram_enabled = 0;
    my $telegram_profile;
    for my $profile ( sort keys %$telegram ) {
        my $bot = $telegram->{$profile};
        next unless ref $bot eq 'HASH';
        # если хотябы у одного бота заполнены client_id, client_secret и oidc_enabled
        # то считаем что авторизация по oidc включена
        if ( ($bot->{client_id} || $bot->{oidc_client_id})
            && ($bot->{client_secret} || $bot->{oidc_client_secret}) && $bot->{oidc_enabled} ) {
            $telegram_enabled = 1;
            $telegram_profile = $profile;
            last;
        }
    }

    return {
        auth => {
            enabled => ( $billing->{allow_user_auth_api} // 1 ) ? JSON::true : JSON::false,
        },
        passkey => {
            enabled => $passkey->{enabled} ? JSON::true : JSON::false,
        },
        register => {
            enabled => ( $billing->{allow_user_register_api} // 1 ) ? JSON::true : JSON::false,
        },
        captcha => {
            enabled => $billing->{allow_user_register_captcha} ? JSON::true : JSON::false,
        },
        oauth2 => {
            providers => \%providers,
        },
        telegram => {
            enabled => $telegram_enabled ? JSON::true : JSON::false,
            ( defined $telegram_profile ? ( profile => $telegram_profile ) : () ),
        },
    };
}
