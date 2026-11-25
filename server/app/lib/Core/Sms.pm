package Core::Sms;

use v5.14;
use utf8;
use parent 'Core::Base';
use Core::Utils qw(encode_json decode_json);
use Digest::SHA qw(sha256_hex);
use HTTP::Request;
use LWP::UserAgent;

sub _configured {
    return ($ENV{EXOLVE_SMS_ENABLED} || '') eq 'true'
        && $ENV{EXOLVE_API_KEY} && $ENV{EXOLVE_SMS_SENDER};
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
    return { accepted => 0, skipped => 'invalid_text' }
        unless length($text) && length($text) <= 140;
    my $attempt = $self->cache->increment('vbios:sms:daily:' . sha256_hex($phone), 86400);
    return { accepted => 0 } unless defined($attempt) && $attempt >= 1 && $attempt <= 5;
    my $request = HTTP::Request->new(POST => 'https://api.exolve.ru/messaging/v1/SendSMS');
    $request->header(Authorization => 'Bearer ' . $ENV{EXOLVE_API_KEY});
    $request->header('Content-Type' => 'application/json');
    $request->content(encode_json({
        number => $ENV{EXOLVE_SMS_SENDER},
        destination => $phone,
        text => $text,
    }));
    my $client = LWP::UserAgent->new(timeout => 10, max_redirect => 0);
    my $response = $client->request($request);
    die "Exolve HTTP error " . $response->code . "\n" unless $response->is_success;
    my $result = eval { decode_json($response->content) };
    die "Exolve did not return a message ID\n"
        unless ref($result) eq 'HASH' && ($result->{message_id} // '') =~ /\A[0-9]+\z/;
    return { accepted => 1, message_id => "$result->{message_id}" };
}

1;
