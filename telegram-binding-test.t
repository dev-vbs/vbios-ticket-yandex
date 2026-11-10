use strict;
use warnings;
use Test::More;

open my $fh, '<:encoding(UTF-8)', 'server/app/lib/Core/Transport/Telegram.pm' or die $!;
my $source = do { local $/; <$fh> };
my ($binding) = $source =~ /(    if \( \$uid && \$self->user->id\(\$uid\) \) \{.*?)\n    my \$chat_id = \$in\{id\};/s;
die 'Missing production binding branch' unless $binding;
{
    package Login;
    sub get_user_id { $_[0]{owner} }
    package User;
    sub id { $_[0]{id} = $_[1]; $_[0] }
    sub settings { $_[0]{settings} }
    sub logins { $_[0] }
    sub add { $_[0]{added}++; $_[0]{fail_add} ? undef : 1 }
    sub set_json { $_[0]{writes}++; 1 }
    package TG;
    sub user { $_[0]{user} }
    sub find_user_by_tg { $_[0]{existing} }
    sub switch_user { }
}
eval 'package TG; sub bind { my ($self,$uid,%in)=@_; my %args=(bind_to_profile=>1); my $profile="vBios_BOT";' . $binding . '}';
die $@ if $@;
sub scenario {
    my ($owner,$metadata,$fail)=@_;
    my $user=bless {settings=>{telegram=>{user_id=>$metadata}},fail_add=>$fail}, 'User';
    # Scope deliberately differs from the database row owner.
    my $tg=bless {user=>$user,existing=>$owner ? bless({owner=>$owner,user_id=>999},'Login') : undef},'TG';
    return ($tg->bind(2,id=>12345),$user);
}
my ($result,$user)=scenario(2,12345);
is($result->{msg},'Successfully bound to Telegram','same-owner binding is idempotent');
ok(!$user->{added} && !$user->{writes},'same-owner repeat does not duplicate records');
($result,$user)=scenario(3,undef);
is($result->{error},'Telegram account already exists','other row owner is rejected');
ok(!$user->{added} && !$user->{writes},'conflict does not write');
($result,$user)=scenario(2,67890);
is($result->{error},'Profile already bound to another Telegram account','different existing Telegram metadata is protected');
($result,$user)=scenario(undef,undef);
is($result->{msg},'Successfully bound to Telegram','new binding succeeds');
is($user->{added},1,'new login is created once');
is($user->{writes},1,'metadata is saved');
($result,$user)=scenario(undef,undef,1);
is($result->{error},'Telegram binding could not be saved','failed insert is not reported as success');
ok(!$user->{writes},'failed login insert does not create metadata');
done_testing;
