package Core::Sms;

use v5.14;
use utf8;
use parent 'Core::Base';
use Core::Utils qw(decode_json);
use Digest::SHA qw(sha256_hex);
use Encode qw(encode_utf8);
use LWP::UserAgent;

sub _configured {
    return ($ENV{SMSC_ENABLED} || '') eq 'true' && $ENV{SMSC_LOGIN} && $ENV{SMSC_PASSWORD};
}

sub _phone {
    my ($self) = @_;
    my @phones = $self->user->phones;
    return unless @phones == 1;
    my $phone = $phones[0];
    return unless $phone =~ /\A\+?[0-9 ()-]+\z/;
    $phone =~ s/[^0-9]//g;
    return $phone =~ /\A[1-9][0-9]{9,14}\z/ ? $phone : undef;
}

sub api_settings {
    my ($self) = @_;
    my $phone = $self->_phone;
    my $chosen = $self->user->settings->{sms_notification_phone} || '';
    return {
        available => _configured() ? 1 : 0,
        has_phone => $phone ? 1 : 0,
        enabled => $phone && $phone eq $chosen ? 1 : 0,
    };
}

sub api_set_settings {
    my ($self, %args) = @_;
    my $value = $args{enabled};
    die 'Invalid SMS preference' unless defined($value) && "$value" =~ /\A(?:0|1|true|false)\z/i;
    my $enabled = "$value" =~ /\A(?:1|true)\z/i;
    my $phone = $enabled ? $self->_phone : '';
    die 'SMS notifications are unavailable' if $enabled && (!_configured() || !$phone);
    $self->user->set_settings({ sms_notification_phone => $phone });
    return $self->api_settings;
}

# Invoked by trusted event templates only.
sub send {
    my ($self, %args) = @_;
    return { accepted => 0 } unless _configured();
    my $phone = $self->_phone;
    return { accepted => 0 } unless $phone && $phone eq ($self->user->settings->{sms_notification_phone} || '');
    my $text = $args{message} // '';
    die 'Invalid SMS text' unless length($text) && length($text) <= 140;
    my $attempt = $self->cache->increment('vbios:sms:daily:' . sha256_hex($phone), 86400);
    return { accepted => 0 } unless defined($attempt) && $attempt >= 1 && $attempt <= 5;
    my %form = (
        login => $ENV{SMSC_LOGIN}, psw => $ENV{SMSC_PASSWORD},
        phones => $phone, mes => encode_utf8($text), fmt => 3, charset => 'utf-8',
    );
    $form{sender} = $ENV{SMSC_SENDER} if $ENV{SMSC_SENDER};
    my $client = LWP::UserAgent->new(timeout => 10, max_redirect => 0);
    my $response = $client->post('https://smsc.ru/sys/send.php', \%form);
    die "SMSC HTTP error " . $response->code . "\n" unless $response->is_success;
    my $result = eval { decode_json($response->content) };
    die "SMSC did not accept the message\n" unless ref($result) eq 'HASH' && !$result->{error} && $result->{id};
    return { accepted => 1 };
}

1;
