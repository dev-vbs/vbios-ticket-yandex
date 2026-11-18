package Core::Remnawave;
use v5.14;
use utf8;
use Core::System::ServiceManager qw(get_service);
use Core::Utils qw(encode_json decode_json);
use Digest::SHA qw(sha256_hex hmac_sha256_hex);
use POSIX qw(strftime);

sub _cabinet_user {
    my ($self,$id)=@_;
    my $key='remna-user-v1-'.sha256_hex(join(':',$self->_cfg->{url},$self->_cfg->{api_token},$self->user_id,$id));
    my $u=eval { $self->cache->get_json($key) };
    return $u if ref($u) eq 'HASH';
    $u=$self->_request(path=>"/api/users/$id")->{response};
    die 'Invalid user response' unless ref($u) eq 'HASH';
    eval { $self->cache->set_json($key,$u,30) };
    return $u;
}
sub _cabinet_invalidate {
    my ($self,$row,$id)=@_;
    my $cfg=$self->_cfg;
    eval {
        $self->cache->delete('remna-user-v1-'.sha256_hex(join(':',$cfg->{url},$cfg->{api_token},$self->user_id,$id)));
        for my $section (qw(nodes traffic history diagnostics)) {
            $self->cache->delete('remna-cabinet-v2-'.sha256_hex(join(':',$cfg->{url},$cfg->{api_token},$self->user_id,$row->{user_service_id},$id,$section)));
        }
    };
}

# Server choices are an administrator-defined entitlement allowlist, never node IDs from clients.
sub _server_choices {
    my ($self,$row)=@_;
    my $defs=$self->_cfg->{server_choices} || [];
    die 'Invalid server choices' unless ref($defs) eq 'ARRAY';
    my @allowed;
    for my $d (@$defs) {
        next unless ref($d) eq 'HASH' && ($d->{key} || '') =~ /^[a-zA-Z0-9_-]{1,64}$/;
        next unless ref($d->{tariff_ids}) eq 'ARRAY' && grep { $_ == $row->{service_id} } @{$d->{tariff_ids}};
        next unless ref($d->{squad_uuids}) eq 'ARRAY' && @{$d->{squad_uuids}};
        die 'Invalid server squad' if grep { !defined($_) || ref($_) || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i } @{$d->{squad_uuids}};
        push @allowed,$d;
    }
    return \@allowed;
}
sub api_select_server {
    my ($self,%a)=@_;
    my $result=eval {
        my $row=$self->_owned_or_error($a{user_service_id});
        die 'Active target required' unless ($row->{status} || '') eq 'ACTIVE';
        my $choices=$self->_server_choices($row);
        my ($choice)=grep { $_->{key} eq ($a{server} || '') } @$choices;
        die 'Server not allowed' unless $choice;
        my %managed=map { map { $_=>1 } @{$_->{squad_uuids}} } @$choices;
        # Paid location grants must not be part of the free switching pool.
        die 'Paid location overlaps server choices' if grep { ref($_) eq 'HASH' && ($_->{type} || '') eq 'locations' && $managed{$_->{squad_uuid} || ''} } @{$self->_cfg->{addons} || []};
        my $lock='remna-addon-'.substr(sha256_hex(join(':',$self->_cfg->{url},$row->{user_service_id})),0,48);
        my ($locked)=$self->dbh->selectrow_array('SELECT GET_LOCK(?, 5)',undef,$lock);
        die 'Server selection busy' unless $locked;
        my $value=eval {
            if (@{$self->_cfg->{addons} || []}) {
                my ($pending)=$self->dbh->selectrow_array('SELECT order_id FROM remnawave_addon_ledger WHERE user_id=? AND target_id=? AND applied=0 AND order_id<>? LIMIT 1',undef,$self->user_id,$row->{user_service_id},0);
                die 'An addon is pending; retry after fulfillment' if $pending;
            }
            my $id=$self->_remna_id($row);
            my $u=$self->_request(path=>"/api/users/$id")->{response};
            die 'Invalid user' unless ref($u) eq 'HASH';
            my %squads=map { (ref($_) ? $_->{uuid} : $_)=>1 } @{$u->{activeInternalSquads} || []};
            delete @squads{keys %managed};
            $squads{$_}=1 for @{$choice->{squad_uuids}};
            # A lost PATCH response must not leave the old selection cached.
            $self->_cabinet_invalidate($row,$id);
            my $updated=$self->_request(path=>'/api/users',method=>'patch',content=>{id=>$id,activeInternalSquads=>[sort keys %squads]})->{response};
            die 'Selection not confirmed' unless ref($updated) eq 'HASH';
            my %got=map { (ref($_) ? $_->{uuid} : $_)=>1 } @{$updated->{activeInternalSquads} || []};
            die 'Selection not confirmed' if keys(%got)!=keys(%squads) || grep { !$got{$_} } keys %squads;
            $self->_cabinet_invalidate($row,$id);
            {ok=>1};
        };
        my $error=$@;
        $self->dbh->selectrow_array('SELECT RELEASE_LOCK(?)',undef,$lock);
        die $error if $error;
        $value;
    };
    return $result if $result;
    get_service('report')->status(400);
    get_service('report')->add_error('Не удалось подтвердить выбор сервера. Обновите список перед повтором. Администратору: проверьте server_choices и права API.');
    return undef;
}

# Only these dedicated methods are routed to customers. No arbitrary API paths.
sub _cabinet_read {
    my ($self,$row,$section)=@_;
    my $id=$self->_remna_id($row);
    my $key='remna-cabinet-v2-'.sha256_hex(join(':',$self->_cfg->{url},$self->_cfg->{api_token},$self->user_id,$row->{user_service_id},$id,$section));
    my $cached=eval { $self->cache->get_json($key) };
    return $cached if ref($cached) eq 'HASH';
    my $result;
    if ($section eq 'nodes') {
        my $allowed=$self->_request(path=>"/api/users/$id/accessible-nodes")->{response};
        die 'Invalid accessible nodes' unless ref($allowed->{activeNodes}) eq 'ARRAY';
        my $health_key='remna-health-v1-'.sha256_hex($self->_cfg->{url}.$self->_cfg->{api_token});
        my $health=eval { $self->cache->get_json($health_key) };
        unless (ref($health) eq 'HASH') {
            my $nodes=eval { $self->_request(path=>'/api/nodes')->{response} };
            $health={};
            if (ref($nodes) eq 'ARRAY') {
                for (@$nodes) { $health->{$_->{uuid}}=$_->{isDisabled} ? 'maintenance' : $_->{isConnected} ? 'online' : 'offline'; }
                eval { $self->cache->set_json($health_key,$health,20) };
            }
        }
        my $choices=$self->_server_choices($row);
        my $u=@$choices ? $self->_cabinet_user($id) : {};
        my %current=map { (ref($_) ? $_->{uuid} : $_)=>1 } @{$u->{activeInternalSquads} || []};
        my %managed=map { map { $_=>1 } @{$_->{squad_uuids}} } @$choices;
        my @selected=grep { $current{$_} } keys %managed;
        $result={server_options=>[map { my $d=$_; my %wanted=map { $_=>1 } @{$d->{squad_uuids}}; {key=>$d->{key},title=>$d->{title} || $d->{key},selected=>(@selected==keys(%wanted) && !grep { !$wanted{$_} } @selected) ? 1 : 0} } @$choices],nodes=>[map { {name=>$_->{nodeName},country=>$_->{countryCode},status=>$health->{$_->{uuid}} || 'unknown'} } @{$allowed->{activeNodes}}]};
    } elsif ($section eq 'traffic') {
        my $end=strftime('%Y-%m-%d',gmtime(time));
        my $start=strftime('%Y-%m-%d',gmtime(time-29*86400));
        my $r=$self->_request(path=>"/api/bandwidth-stats/users/$id?start=$start&end=$end")->{response};
        die 'Invalid bandwidth statistics' unless ref($r->{categories}) eq 'ARRAY' && ref($r->{sparklineData}) eq 'ARRAY';
        $result={days=>$r->{categories},bytes=>$r->{sparklineData},start=>$start,end=>$end};
    } elsif ($section eq 'history') {
        my $r=$self->_request(path=>"/api/users/$id/subscription-request-history")->{response};
        die 'Invalid subscription history' unless ref($r->{records}) eq 'ARRAY';
        $result={records=>[map { {at=>$_->{requestAt},client=>$_->{userAgent},type=>$_->{srrResponseType}} } @{$r->{records}}]};
    } else {
        my $u=$self->_cabinet_user($id);
        die 'Invalid user response' unless ref($u) eq 'HASH';
        my $t=$u->{userTraffic} || {};
        my @notices;
        push @notices,{kind=>'traffic',text=>'Использовано больше 80% трафика'} if $u->{trafficLimitBytes} && ($t->{usedTrafficBytes} || 0)>=$u->{trafficLimitBytes}*.8;
        my $expiry=$u->{expireAt} || '';
        my $soon=strftime('%Y-%m-%dT%H:%M:%S',gmtime(time+3*86400));
        push @notices,{kind=>'expiry',text=>'Срок услуги заканчивается в ближайшие три дня'} if $expiry && $expiry le $soon;
        my $device_error;
        eval {
            my $devices=$self->_request(path=>"/api/hwid/devices/$id")->{response};
            $devices=$devices->{devices} if ref($devices) eq 'HASH';
            die 'Invalid devices' unless ref($devices) eq 'ARRAY';
            my $device_key='remna-device-notices-v1-'.sha256_hex($key);
            my $previous=$self->cache->get_json($device_key);
            my %current=map { sha256_hex($_->{hwid})=>1 } grep { ref($_) eq 'HASH' && $_->{hwid} } @$devices;
            my $new=ref($previous) eq 'HASH' && ref($previous->{seen}) eq 'HASH' && grep { !$previous->{seen}{$_} } keys %current;
            my $new_at=$new ? time : ref($previous) eq 'HASH' ? $previous->{new_at} : undef;
            $self->cache->set_json($device_key,{seen=>\%current,new_at=>$new_at},30*86400);
            push @notices,{kind=>'device',text=>'В подписке появилось новое устройство. Проверьте центр устройств.'} if $new_at && time-$new_at<3*86400;
            1;
        } or $device_error=1;
        $result={status=>$u->{status},billing_status=>$row->{status},billing_expires_at=>$row->{expire},expires_at=>$expiry,used_bytes=>$t->{usedTrafficBytes},limit_bytes=>$u->{trafficLimitBytes},reset_strategy=>$u->{trafficLimitStrategy},last_reset_at=>$u->{lastTrafficResetAt},notices=>\@notices,devices_unavailable=>$device_error ? 1 : 0};
    }
    eval { $self->cache->set_json($key,$result,30) };
    return $result;
}
sub api_cabinet {
    my ($self,%a)=@_;
    my $result=eval {
        my $row=$self->_owned_or_error($a{user_service_id});
        my $section=$a{section} || 'diagnostics';
        die 'Invalid section' unless $section =~ /^(nodes|traffic|history|diagnostics)$/;
        $self->_cabinet_read($row,$section);
    };
    return $result if $result;
    get_service('report')->status(502);
    get_service('report')->add_error('Не удалось обновить данные сервиса. Повторите позже.');
    return undef;
}
sub _cabinet_store_subscription {
    my ($self,$row,$u)=@_;
    die 'Missing replacement URL' unless ref($u) eq 'HASH' && ($u->{subscriptionUrl} || '') =~ m{^https?://};
    my $name=($self->_cfg->{storage_prefix} || 'vpn_mrzb_').$row->{user_service_id};
    my $storage=$self->srv('storage');
    $storage->save($name,{subscription_url=>$u->{subscriptionUrl},subscriptionUrl=>$u->{subscriptionUrl},shortUuid=>$u->{shortUuid}});
    my $entry=$storage->id($name) or die 'Storage entry missing';
    $entry->reload;
    my $check=$entry->data;
    die 'Storage save not confirmed' unless ref($check) eq 'HASH' && ($check->{subscription_url} || '') eq $u->{subscriptionUrl};
}
sub api_rotate_subscription {
    my ($self,%a)=@_;
    my $result=eval {
        my $row=$self->_owned_or_error($a{user_service_id});
        my $key='remna-revoke-'.$self->user_id.'-'.$row->{user_service_id};
        my $count=$self->cache->increment($key,86400);
        die 'Rate limit' unless defined($count) && $count<=3;
        my $id=$self->_remna_id($row);
        $self->_cabinet_invalidate($row,$id);
        my $u=$self->_request(path=>'/api/users/'.$id.'/actions/revoke',method=>'post',content=>{revokeOnlyPasswords=>\0})->{response};
        $self->_cabinet_store_subscription($row,$u);
        $self->_cabinet_invalidate($row,$id);
        {ok=>1,url=>$u->{subscriptionUrl}};
    };
    return $result if $result;
    get_service('report')->status(400);
    get_service('report')->add_error('Не удалось заменить ссылку. Проверьте текущую ссылку перед повторной попыткой. Лимит — три запроса в сутки.');
    return undef;
}
sub api_subscription_access {
    my ($self,%a)=@_;
    my $result=eval {
        my $row=$self->_owned_or_error($a{user_service_id});
        my $u=$self->_request(path=>'/api/users/'.$self->_remna_id($row))->{response};
        $self->_cabinet_store_subscription($row,$u);
        {ok=>1,url=>$u->{subscriptionUrl}};
    };
    return $result if $result;
    get_service('report')->status(502);
    get_service('report')->add_error('Не удалось получить текущую ссылку. Повторите позже.');
    return undef;
}
sub _addon_signature {
    my ($self,$uid,$target,$service,$definition)=@_;
    my $cfg=get_service('config')->data_by_name('remna') || {};
    die 'Addon signing key required (32+ characters)' unless length($cfg->{addon_signing_key} || '')>=32 && $cfg->{addon_signing_key} !~ /REPLACE|YOUR_|CHANGE_/i;
    return hmac_sha256_hex(join('|',$uid,$target,$service,$definition),$cfg->{addon_signing_key});
}
sub api_addons {
    my ($self,%a)=@_;
    my $result=eval {
        my $row=$self->_owned_or_error($a{user_service_id});
        my $defs=$self->_cfg->{addons} || [];
        die 'Invalid addon configuration' unless ref($defs) eq 'ARRAY';
        my @list;
        my @setup_issues;
        if (@$defs) {
            eval { $self->_addon_signature($self->user_id,$row->{user_service_id},0,'check'); 1 }
                or push @setup_issues,'Не настроен ключ подписи расширений. Администратору: задайте addon_signing_key.';
            eval { my ($ready)=$self->dbh->selectrow_array('SELECT COUNT(*) FROM remnawave_addon_ledger WHERE order_id=0'); die 'Schema missing' unless defined $ready; 1 }
                or push @setup_issues,'Не установлен журнал выдачи. Администратору: импортируйте remnawave-addons.sql в базу SHM.';
        }
        my $u=@$defs ? $self->_cabinet_user($self->_remna_id($row)) : {};
        for my $def (@$defs) {
            next unless ref($def) eq 'HASH' && ($def->{service_id} || '') =~ /^[1-9][0-9]*$/;
            next if ref($def->{tariff_ids}) eq 'ARRAY' && !grep { $_ == $row->{service_id} } @{$def->{tariff_ids}};
            my $service=get_service('service',_id=>$def->{service_id});
            unless ($service) {
                push @list,{key=>$def->{key},title=>$def->{title},service_id=>$def->{service_id},cost=>0,unavailable_reason=>'Услуга расширения не найдена в SHM. Проверьте service_id.'};
                next;
            }
            my $reason=$service->get_period ? 'В SHM нужен разовый тариф: период 0.' : $service->get_cost<=0 ? 'В SHM укажите цену больше нуля.' : '';
            $reason='Заказ этой услуги запрещён в SHM.' unless $service->price_list_check_allow_to_order;
            $reason='Неизвестный тип расширения.' unless ($def->{type} || '') =~ /^(devices|traffic|locations)$/;
            $reason='Некорректный объём расширения.' if ($def->{type} || '') =~ /^(devices|traffic)$/ && ($def->{amount} || '') !~ /^[1-9][0-9]{0,15}$/;
            $reason='Укажите настоящий UUID internal squad.' if ($def->{type} || '') eq 'locations' && ($def->{squad_uuid} || '') !~ /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
            $reason='У вас уже безлимитное количество устройств.' if ($def->{type} || '') eq 'devices' && !$u->{hwidDeviceLimit};
            $reason='У вас уже безлимитный трафик.' if ($def->{type} || '') eq 'traffic' && !$u->{trafficLimitBytes};
            $reason='Эта локация уже входит в подписку.' if ($def->{type} || '') eq 'locations' && grep { (ref($_) ? $_->{uuid} : $_) eq ($def->{squad_uuid} || '') } @{$u->{activeInternalSquads} || []};
            if (($def->{type} || '') eq 'locations') {
                my %free=map { map { $_=>1 } @{$_->{squad_uuids}} } @{$self->_server_choices($row)};
                $reason='Эта группа уже входит в бесплатный выбор серверов. Исправьте настройки расширения.' if $free{$def->{squad_uuid} || ''};
            }
            $reason=$setup_issues[0] if @setup_issues;
            push @list,{key=>$def->{key},title=>$def->{title},service_id=>$def->{service_id},cost=>$service->get_cost,unavailable_reason=>$reason};
        }
        {addons=>\@list,setup_issues=>\@setup_issues};
    };
    return $result if $result;
    return $self->_api_error('Дополнительные возможности сейчас недоступны');
}
sub api_purchase_addon {
    my ($self,%a)=@_;
    my $result=eval {
        my $row=$self->_owned_or_error($a{user_service_id});
        die 'Active target required' unless ($row->{status} || '') eq 'ACTIVE';
        my ($def)=grep { ref($_) eq 'HASH' && ($_->{key} || '') eq ($a{addon} || '') } @{$self->_cfg->{addons} || []};
        die 'Unknown addon' unless $def;
        die 'Tariff not allowed' if ref($def->{tariff_ids}) eq 'ARRAY' && !grep { $_ == $row->{service_id} } @{$def->{tariff_ids}};
        my $service=get_service('service',_id=>$def->{service_id});
        die 'Addon must be a paid one-time service' unless $service && !$service->get_period && $service->get_cost>0 && $service->price_list_check_allow_to_order;
        die 'Invalid addon type' unless ($def->{type} || '') =~ /^(devices|traffic|locations)$/;
        if ($def->{type} ne 'locations') {
            die 'Invalid addon amount' unless ($def->{amount} || '') =~ /^[1-9][0-9]{0,15}$/;
            my $u=$self->_request(path=>'/api/users/'.$self->_remna_id($row))->{response};
            my $field=$def->{type} eq 'devices' ? 'hwidDeviceLimit' : 'trafficLimitBytes';
            die 'Already unlimited' unless ref($u) eq 'HASH' && $u->{$field};
            die 'Addon limit too large' if $u->{$field}+$def->{amount}>9007199254740991;
        } else {
            die 'Invalid squad UUID' unless ($def->{squad_uuid} || '') =~ /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
            my %free=map { map { $_=>1 } @{$_->{squad_uuids}} } @{$self->_server_choices($row)};
            die 'Paid location overlaps server choices' if $free{$def->{squad_uuid}};
            my $u=$self->_request(path=>'/api/users/'.$self->_remna_id($row))->{response};
            die 'Already accessible' if grep { (ref($_) ? $_->{uuid} : $_) eq $def->{squad_uuid} } @{$u->{activeInternalSquads} || []};
        }
        my $count=$self->cache->increment('remna-addon-orders-'.$self->user_id,600);
        die 'Too many orders' unless defined($count) && $count<=5;
        my ($schema_ready)=$self->dbh->selectrow_array('SELECT COUNT(*) FROM remnawave_addon_ledger WHERE order_id=0');
        die 'Install addon ledger schema first' unless defined $schema_ready;
        my $definition=encode_json($def);
        my $signature=$self->_addon_signature($self->user_id,$row->{user_service_id},$def->{service_id},$definition);
        my $us=get_service('USObject')->create(service_id=>$def->{service_id},check_allow_to_order=>1,
            settings=>{remna_addon=>{target=>$row->{user_service_id},definition=>$definition,signature=>$signature}});
        die 'Order failed' unless $us;
        {ok=>1,order_id=>$us->id,paid=>$us->is_paid ? 1 : 0};
    };
    return $result if $result;
    my $error=$@ || '';
    my $message=$error =~ /signing key/ ? 'Администратору: настройте addon_signing_key (openssl rand -hex 32).'
        : $error =~ /overlaps server choices/ ? 'Локация уже входит в бесплатный выбор серверов. Исправьте настройки расширения.'
        : $error =~ /ledger|schema/ ? 'Администратору: установите SQL-схему remnawave-addons.sql в базе SHM.'
        : $error =~ /Already unlimited/ ? 'Услуга уже безлимитная: это расширение не требуется.'
        : $error =~ /Already accessible/ ? 'Эта локация уже входит в подписку.'
        : $error =~ /Tariff not allowed/ ? 'Расширение недоступно для вашего тарифа: проверьте tariff_ids.'
        : $error =~ /one-time service/ ? 'Проверьте услугу SHM: период 0, цена больше нуля, заказ разрешён.'
        : $error =~ /Invalid squad/ ? 'Администратору: укажите настоящий UUID internal squad в расширении.'
        : 'Не удалось подтвердить заказ. Проверьте список услуг перед повторной покупкой.';
    get_service('report')->status(400);
    get_service('report')->add_error($message);
    return undef;
}
# Called by the paid SHM service's local activation event. Never routed to HTTP.
sub fulfill_addon {
    my ($self,%a)=@_;
    my $order=$self->_owned_or_error($a{order_id});
    my $us=get_service('USObject',_id=>$order->{user_service_id});
    die 'Payment required' unless $us && $us->is_paid;
    my $settings=decode_json($order->{settings} || '{}') || {};
    my $meta=$settings->{remna_addon} || die 'Not an addon order';
    die 'Invalid addon signature' unless ($meta->{signature} || '') eq $self->_addon_signature($self->user_id,$meta->{target},$order->{service_id},$meta->{definition});
    my $target=$self->_owned_or_error($meta->{target});
    die 'Active target required' unless ($target->{status} || '') eq 'ACTIVE';
    my $lock='remna-addon-'.substr(sha256_hex(join(':',$self->_cfg->{url},$meta->{target})),0,48);
    my ($locked)=$self->dbh->selectrow_array('SELECT GET_LOCK(?, 5)',undef,$lock);
    die 'Addon busy; retry task' unless $locked;
    my $result=eval {
        # SHM holds a row lock on the order during local tasks. Never write that
        # row from the autocommit connection: the separate ledger survives task
        # rollback without blocking on SHM's own lock.
        my $ledger=$self->dbh->selectrow_hashref('SELECT * FROM remnawave_addon_ledger WHERE order_id=? AND user_id=?',undef,$order->{user_service_id},$self->user_id);
        die 'Ledger binding changed' if $ledger && ($ledger->{target_id}!=$meta->{target} || ($ledger->{signature} || '') ne $meta->{signature});
        if ($ledger && $ledger->{applied}) { {ok=>1,already_applied=>1}; }
        else {
            my ($pending)=$self->dbh->selectrow_array('SELECT order_id FROM remnawave_addon_ledger WHERE user_id=? AND target_id=? AND applied=0 AND order_id<>? LIMIT 1',undef,$self->user_id,$meta->{target},$order->{user_service_id});
            die 'Another addon is pending; retry task' if $pending;
            my $def=decode_json($meta->{definition});
            my $id=$self->_remna_id($target);
            my $desired;
            if ($ledger) { $desired=decode_json($ledger->{desired}); }
            else {
                my $u=$self->_request(path=>"/api/users/$id")->{response};
                die 'Invalid user' unless ref($u) eq 'HASH';
                $desired={id=>$id};
                if (($def->{type} || '') eq 'devices' || ($def->{type} || '') eq 'traffic') {
                    die 'Invalid quantity' unless ($def->{amount} || '') =~ /^[1-9][0-9]{0,15}$/;
                    my $field=$def->{type} eq 'devices' ? 'hwidDeviceLimit' : 'trafficLimitBytes';
                    die 'Already unlimited' unless $u->{$field};
                    $desired->{$field}=$u->{$field}+$def->{amount};
                    die 'Addon limit too large' if $desired->{$field}>9007199254740991;
                } elsif (($def->{type} || '') eq 'locations') {
                    die 'Invalid squad UUID' unless ($def->{squad_uuid} || '') =~ /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
                    my %squads=map { (ref($_) ? $_->{uuid} : $_)=>1 } @{$u->{activeInternalSquads} || []};
                    $squads{$def->{squad_uuid}}=1;
                    $desired->{activeInternalSquads}=[sort keys %squads];
                } else { die 'Unknown addon type'; }
                my $saved=$self->dbh->do('INSERT INTO remnawave_addon_ledger (order_id,user_id,target_id,signature,desired,applied) VALUES (?,?,?,?,?,0)',undef,$order->{user_service_id},$self->user_id,$meta->{target},$meta->{signature},encode_json($desired));
                die 'Unable to persist addon ledger' unless $saved;
            }
            die 'Binding changed' unless ref($desired) eq 'HASH' && $desired->{id} == $id;
            my $updated=$self->_request(path=>'/api/users',method=>'patch',content=>$desired)->{response};
            die 'Update not confirmed' unless ref($updated) eq 'HASH';
            for my $field (qw(hwidDeviceLimit trafficLimitBytes)) {
                die 'Limit not confirmed' if exists($desired->{$field}) && ($updated->{$field} // -1)!=$desired->{$field};
            }
            if ($desired->{activeInternalSquads}) {
                my %got=map { (ref($_) ? $_->{uuid} : $_)=>1 } @{$updated->{activeInternalSquads} || []};
                die 'Locations not confirmed' if grep { !$got{$_} } @{$desired->{activeInternalSquads}};
            }
            my $saved=$self->dbh->do('UPDATE remnawave_addon_ledger SET applied=1,applied_at=CURRENT_TIMESTAMP WHERE order_id=? AND user_id=?',undef,$order->{user_service_id},$self->user_id);
            die 'Unable to confirm addon ledger' unless $saved;
            $self->_cabinet_invalidate($target,$id);
            {ok=>1};
        }
    };
    my $error=$@;
    $self->dbh->selectrow_array('SELECT RELEASE_LOCK(?)',undef,$lock);
    die $error if $error;
    return $result;
}
1;
