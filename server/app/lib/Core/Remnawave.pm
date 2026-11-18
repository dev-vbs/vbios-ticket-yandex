package Core::Remnawave;
use v5.14;
use parent 'Core::Base';
use Core::Base;
use Core::System::ServiceManager qw(get_service);
use Core::Utils qw(decode_json now);
use Data::Validate::IP qw(is_ipv4 is_ipv6);
use IO::Socket::IP;
use Time::HiRes qw(time);

sub _cfg {
    my $self = shift;
    return $self->{hwid_config} || get_service('config')->data_by_name('remna') || {};
}
sub _configure_service {
    my ($self, $row) = @_;
    my $settings = decode_json($row->{settings} || '{}') || {};
    my $cfg = get_service('config')->data_by_name('remna') || {};
    my $server_settings = {};
    if ($settings->{server_id}) {
        my $server = $self->dbh->selectrow_hashref('SELECT settings FROM servers WHERE server_id=?', undef, $settings->{server_id});
        die 'Service server not found' unless $server;
        $server_settings = decode_json($server->{settings} || '{}') || {};
    }
    $self->{hwid_config} = { %$cfg };
    # Match Remnawave_LOCAL: server settings override config.remna.
    for my $key (qw(url api_token name_prefix)) {
        $self->{hwid_config}{$key} = $server_settings->{$key} if $server_settings->{$key};
    }
}
sub _transport { get_service('Transport::Http') }
sub found_rows { 1 }
my %latency_cache;
sub _tcp_latency_ms {
    my ($address, $port) = @_;
    return undef unless defined $address && defined $port && $port =~ /^\d+$/ && $port > 0 && $port < 65536;
    my $host = $address;
    $host =~ s/^\[//; $host =~ s/\]$//;
    return undef if $host =~ /[^a-zA-Z0-9.:-]/;
    my $key = "$host:$port";
    return $latency_cache{$key}{value} if $latency_cache{$key} && time - $latency_cache{$key}{time} < 60;
    my $started = time;
    my $socket = eval { IO::Socket::IP->new(PeerHost => $host, PeerPort => $port, Proto => 'tcp', Timeout => 0.5) };
    my $latency = $socket ? int((time - $started) * 1000 + 0.5) : undef;
    close $socket if $socket;
    %latency_cache = () if keys(%latency_cache) > 100;
    $latency_cache{$key} = { time => time, value => $latency };
    return $latency;
}
sub api_monitor {
    my $self = shift;
    my $main = get_service('config')->data_by_name('main') || {};
    return { enabled => 0, nodes => [] } unless $main->{monitor_enabled};
    my $visible = $main->{monitor_nodes};
    return { enabled => 1, state => 'empty', nodes => [] } unless ref($visible) eq 'ARRAY' && @$visible;
    my $response = eval { $self->_request(path => '/api/nodes') };
    return { enabled => 1, state => 'unknown', nodes => [] } if $@ || ref($response) ne 'HASH' || ref($response->{response}) ne 'ARRAY';
    my %nodes = map { ref($_) eq 'HASH' && $_->{uuid} ? ($_->{uuid} => $_) : () } @{$response->{response}};
    my @public;
    for my $item (@$visible) {
        next unless ref($item) eq 'HASH' && $item->{uuid};
        my $node = $nodes{$item->{uuid}};
        my $ip = $item->{ping_ip};
        my $ip_url = defined($ip) && !ref($ip) && is_ipv4($ip) ? 'https://'.$ip.'/ping'
            : defined($ip) && !ref($ip) && is_ipv6($ip) ? 'https://['.$ip.']/ping' : undef;
        push @public, {
            name => substr($item->{title} || 'Сервер', 0, 100),
            country => substr($item->{description} || '', 0, 100),
            ping_url => ($item->{ping_url} && !ref($item->{ping_url}) && $item->{ping_url} =~ m{^https://[^\s\@]+$}) ? $item->{ping_url} : $ip_url,
            status => !$node ? 'unknown' : $node->{isDisabled} ? 'maintenance' : $node->{isConnected} ? 'online' : 'offline',
            latency_ms => $node ? _tcp_latency_ms($node->{address}, $node->{port}) : undef,
        };
        last if @public >= 30;
    }
    return { enabled => 1, state => 'ready', checked_at => time(), nodes => \@public };
}
sub _request {
    my ($self,%a)=@_; my $cfg=$self->_cfg;
    die 'Remnawave URL is not configured' unless $cfg->{url};
    die 'Remnawave API token is not configured' unless $cfg->{api_token};
    my $base=$cfg->{url}; $base =~ s{/+$}{};
    my $method=lc($a{method} || 'get');
    my %request=(url=>$base.$a{path}, method=>$method,
        headers=>{Authorization=>'Bearer '.$cfg->{api_token},Accept=>'application/json',
            ($base =~ m{^http:} ? ('X-Forwarded-For'=>'127.0.0.1','X-Forwarded-Proto'=>'https') : ())});
    $request{content_type}='application/json; charset=utf-8' if $method ne 'get';
    $request{content}=$a{content} if exists $a{content} && $method ne 'get';
    my $resp=$self->_transport->http(%request);
    my $body=eval { $resp->json_content };
    $body = {} unless defined $body;
    unless ($resp->is_success) {
        my $description = ref($body) eq 'HASH' ? ($body->{message} || $body->{error} || $body->{description} || $body->{response}{message} || '') : '';
        $description ||= eval { $resp->decoded_content } || '';
        $description = substr($description, 0, 300);
        $description =~ s/[\r\n]+/ /g;
        die 'Remnawave request failed: HTTP '.$resp->code.' '.($description || $resp->status_line).' ['.$method.' '.$a{path}.']';
    }
    return $body;
}
sub _owned {
    # Service settings are stored on user_services in SHM; services has config, not settings.
    my ($self,$uid,$usi)=@_; return $self->dbh->selectrow_hashref('SELECT us.user_service_id,us.user_id,us.service_id,us.settings,s.name,s.config FROM user_services us JOIN services s ON s.service_id=us.service_id WHERE us.user_service_id=? AND us.user_id=?',undef,$usi,$uid);
}
sub _owned_or_error {
    my ($self,$usi)=@_;
    die 'user_service_id is required' unless defined $usi && "$usi" =~ /^\d+$/ && $usi > 0;
    my $uid=$self->user_id;
    my $row=$self->_owned($uid,int($usi));
    if ($row) { $self->_configure_service($row); return $row; }
    my ($owner)=$self->dbh->selectrow_array('SELECT user_id FROM user_services WHERE user_service_id=?',undef,int($usi));
    die 'service not found (user_service_id='.int($usi).', session_user_id='.(defined $uid ? $uid : 'NULL').', owner_user_id='.(defined $owner ? $owner : 'NULL').')';
}
sub _remna_id {
    my ($self,$row)=@_;
    my $cfg=$self->_cfg;
    my $prefix=$cfg->{storage_prefix} || 'vpn_mrzb_';
    # Remnawave HWID endpoints require the numeric Remnawave user id. Resolve by
    # the SHM generated username first; storage may contain a subscription id.
    my $stored=eval { $self->srv('storage')->read(name=>$prefix.$row->{user_service_id}) } || {};
    return int($stored->{id}) if defined($stored->{id}) && $stored->{id} =~ /^[1-9][0-9]*$/;
    my $username_prefix=$cfg->{name_prefix} || $cfg->{username_prefix} || 'vBios_us_';
    my $resolved=eval { $self->_request(path=>'/api/users/by-username/'.$username_prefix.$row->{user_service_id}) } || {};
    my $resolved_payload=$resolved->{response} || $resolved->{data} || $resolved;
    my $resolved_id=ref($resolved_payload) eq 'HASH' ? ($resolved_payload->{id} || $resolved_payload->{user}{id}) : undef;
    return int($resolved_id) if defined $resolved_id && "$resolved_id" =~ /^\d+$/ && $resolved_id > 0;
    my $data=eval { $self->srv('storage')->read(name=>$prefix.$row->{user_service_id}) } || {};
    my $id=$data->{id} || $data->{uuid} || $data->{user}{id} || $data->{user}{uuid} || $data->{response}{user}{id} || $data->{response}{user}{uuid};
    if (!$id && $data->{shortUuid}) {
        my $resolved=$self->_request(path=>'/api/users/by-short-uuid/'.$data->{shortUuid});
        $id=$resolved->{response}{id} || $resolved->{response}{uuid} || $resolved->{id} || $resolved->{uuid} || $resolved->{data}{id} || $resolved->{data}{uuid};
    }
    if (!$id) {
        $id=$resolved_payload->{id} || $resolved_payload->{uuid} || $resolved_payload->{user}{id} || $resolved_payload->{user}{uuid};
    }
    die 'Remnawave numeric user id is not found for this service' unless defined $id && "$id" =~ /^\d+$/ && $id > 0;
    return int($id);
}
sub _limit {
    my ($self,$row)=@_;
    my $settings=eval { decode_json($row->{settings}||'{}') } || {};
    my $config=eval { decode_json($row->{config}||'{}') } || {};
    my $global=$self->_cfg;
    # config.remna is the single source of truth for the cabinet/API.
    # 0 explicitly means unlimited. Keep per-service values only as a
    # backwards-compatible fallback when the global option is absent.
    my $value;
    my @sources = exists $global->{hwidDeviceLimit} || exists $global->{hwid_device_limit}
        ? ($global) : ($settings,$config,$global);
    for my $source (@sources) {
        for my $key (qw(hwidDeviceLimit hwid_device_limit)) {
            if (defined $source->{$key} && "$source->{$key}" =~ /^\d+$/) {
                $value=$source->{$key}; last;
            }
        }
        last if defined $value;
    }
    return defined $value ? int($value) : 0;
}
sub api_hwid_list {
    my ($self,%a)=@_;
    my $result;
    my $ok = eval {
        my $row=$self->_owned_or_error($a{user_service_id});
        my $r=$self->_request(path=>'/api/hwid/devices/'.$self->_remna_id($row));
        my $payload=$r->{response} || $r->{data} || $r;
        $payload=$payload->{response} if ref($payload) eq 'HASH' && ref($payload->{response}) eq 'HASH';
        my $devices=ref($payload) eq 'ARRAY' ? $payload : ($payload->{devices});
        die 'unexpected Remnawave devices response' unless ref($devices) eq 'ARRAY';
        $result={devices=>$devices,limit=>$self->_limit($row)};
        1;
    };
    unless ($ok) {
        my $error = $@ || 'unknown request error';
        $error =~ s/[\r\n]+/ /g;
        get_service('report')->status(400);
        get_service('report')->add_error('HWID: '.$error);
        return undef;
    }
    return $result;
}
sub api_connection_stats {
    my ($self,%a)=@_;
    my $result;
    my $ok=eval {
        my $row=$self->_owned_or_error($a{user_service_id});
        my $response=$self->_request(path=>'/api/users/'.$self->_remna_id($row));
        my $user=$response->{response} || $response->{data} || $response;
        die 'Invalid user statistics response' unless ref($user) eq 'HASH';
        my $traffic=ref($user->{userTraffic}) eq 'HASH' ? $user->{userTraffic} : $user;
        # Explicit allowlist: never expose subscription URLs, tokens or other users.
        $result={used_bytes=>$traffic->{usedTrafficBytes},
            lifetime_bytes=>$traffic->{lifetimeUsedTrafficBytes},
            limit_bytes=>$user->{trafficLimitBytes},
            reset_strategy=>$user->{trafficLimitStrategy},
            online_at=>$traffic->{onlineAt}, first_connected_at=>$traffic->{firstConnectedAt},
            last_subscription_at=>$user->{subLastOpenedAt}};
        1;
    };
    return $ok ? $result : $self->_api_error($@);
}
sub _reset_count {
    my ($self,$uid,$usi)=@_;
    my @date=localtime;
    my $day=sprintf('%04d%02d%02d',$date[5]+1900,$date[4]+1,$date[3]);
    my $key='remna-hwid-resets-v2-'.$uid.'-'.$usi.'-'.$day;
    $self->{hwid_reset_key}=$key;
    my $count=$self->cache->increment($key,86400);
    die 'HWID reset counter unavailable' unless defined $count;
    return $count;
}
sub _reset_limit {
    my ($self,$row)=@_;
    my $settings=decode_json($row->{settings}||'{}') || {};
    my $config=decode_json($row->{config}||'{}') || {};
    my $value=$settings->{hwid_reset_daily_limit} // $config->{hwid_reset_daily_limit} // $self->_cfg->{hwid_reset_daily_limit} // 3;
    return $value =~ /^[1-9][0-9]*$/ ? int($value) : 3;
}
sub _refund_reset {
    my $self=shift;
    my $key=delete $self->{hwid_reset_key};
    eval { $self->cache->redis->decr($key) } if $key;
}
sub _api_error { my ($self,$error)=@_; $error ||= 'unknown request error'; $error =~ s/[\r\n]+/ /g; get_service('report')->status(400); get_service('report')->add_error('HWID: '.substr($error,0,500)); return undef }
sub api_hwid_delete { my ($self,%a)=@_; my $result; my $ok=eval { my $row=$self->_owned_or_error($a{user_service_id}); die 'hwid is required' unless defined $a{hwid} && length $a{hwid}; my $count=$self->_reset_count($self->user_id,$row->{user_service_id}); die 'daily HWID limit exceeded' if $count > $self->_reset_limit($row); my $r=$self->_request(path=>'/api/hwid/devices/delete',method=>'post',content=>{userId=>$self->_remna_id($row),hwid=>$a{hwid}}); $result={ok=>1,data=>$r}; 1 }; my $failure=$@; if ($ok) { delete $self->{hwid_reset_key}; } else { $self->_refund_reset; } return $ok ? $result : $self->_api_error($failure) }
sub api_hwid_reset { my ($self,%a)=@_; my $result; my $ok=eval { my $row=$self->_owned_or_error($a{user_service_id}); my $list=$self->api_hwid_list(user_service_id=>$row->{user_service_id}) or die 'unable to read HWID devices'; my $devices=$list->{devices}; $devices=[] unless ref($devices) eq 'ARRAY'; my $n=scalar @$devices; if (!$n) { $result={ok=>1,deleted=>0}; } else { my $count=$self->_reset_count($self->user_id,$row->{user_service_id}); die 'daily HWID limit exceeded' if $count > $self->_reset_limit($row); my $r=$self->_request(path=>'/api/hwid/devices/delete-all',method=>'post',content=>{userId=>$self->_remna_id($row)}); $result={ok=>1,deleted=>$n,data=>$r}; } 1 }; my $failure=$@; if ($ok) { delete $self->{hwid_reset_key}; } else { $self->_refund_reset; } return $ok ? $result : $self->_api_error($failure) }
1;
