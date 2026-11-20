package Core::Push;
use v5.14;
use utf8;
use parent 'Core::Base';
use Core::Base;
use Core::Utils qw(encode_json decode_json);
use LWP::UserAgent;
use HTTP::Request;

# Server-side LOCAL templates only; no public arbitrary-recipient endpoint.
sub send {
    my ($self, %args) = @_;
    return { enabled => 0, sent => 0 } unless ($ENV{WEB_PUSH_ENABLE} || '') eq 'true';
    my $uid = $args{user_id} || $self->user_id;
    die 'Invalid push recipient' unless $uid && $uid =~ /^\d+$/;
    die 'Administrator required' if $uid != $self->user_id && !$self->user->is_admin;
    die 'Push token is not configured' unless length($ENV{PUSH_INTERNAL_TOKEN} || '') >= 32;
    my $request = HTTP::Request->new(POST => 'http://push:8090/internal/send');
    $request->header('Authorization' => 'Bearer ' . $ENV{PUSH_INTERNAL_TOKEN});
    $request->header('Content-Type' => 'application/json');
    $request->content(encode_json({ user_id => int($uid), title => $args{title} || 'vBios', body => $args{body} || '', url => $args{url} || '/notifications', tag => $args{tag} || 'vbios' }));
    my $response = LWP::UserAgent->new(timeout => 65)->request($request);
    die 'Push service did not confirm request' unless $response->is_success;
    return decode_json($response->decoded_content);
}
1;
