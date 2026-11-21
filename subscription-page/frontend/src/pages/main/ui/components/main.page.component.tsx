import { ActionIcon, Anchor, Badge, Box, Button, Center, Container, Group, Image, Paper, Stack, Text, Title, useMantineColorScheme } from '@mantine/core'
import { useClipboard } from '@mantine/hooks'
import { IconArrowLeft, IconArrowRight, IconCheck, IconCopy, IconDeviceMobile, IconWallet, IconSun, IconMoon, IconShieldCheck, IconQrcode } from '@tabler/icons-react'
import { TSubscriptionPagePlatformKey } from '@remnawave/subscription-page-types'
import { useSubscription } from '@entities/subscription-info-store'
import { useAppConfig, useAppConfigStoreActions, useCurrentLang } from '@entities/app-config-store'
import { constructSubscriptionUrl } from '@shared/utils/construct-subscription-url'
import { LanguagePicker } from '@shared/ui/language-picker/language-picker.shared'
import { Page, RemnawaveLogo } from '@shared/ui'
import {
    AccordionBlockRenderer, CardsBlockRenderer, InstallationGuideConnector, MinimalBlockRenderer,
    RawKeysWidget, SubscriptionInfoCardsWidget, SubscriptionInfoCollapsedWidget,
    SubscriptionInfoExpandedWidget, SubscriptionLinkWidget, TimelineBlockRenderer
} from '@widgets/main'

interface IMainPageComponentProps {
    isMobile: boolean
    platform: TSubscriptionPagePlatformKey | undefined
}

const BLOCK_RENDERERS = {
    cards: CardsBlockRenderer,
    timeline: TimelineBlockRenderer,
    accordion: AccordionBlockRenderer,
    minimal: MinimalBlockRenderer
} as const

const SUBSCRIPTION_INFO_BLOCK_RENDERERS = {
    cards: SubscriptionInfoCardsWidget,
    collapsed: SubscriptionInfoCollapsedWidget,
    expanded: SubscriptionInfoExpandedWidget,
    hidden: null
} as const

export const MainPageComponent = ({ isMobile, platform }: IMainPageComponentProps) => {
    const { colorScheme, toggleColorScheme } = useMantineColorScheme()
    const clipboard = useClipboard({ timeout: 2000 })
    const config = useAppConfig()
    const subscription = useSubscription()
    const currentLang = useCurrentLang()
    const { setLanguage } = useAppConfigStoreActions()
    const cabinetUrl = document.querySelector<HTMLMetaElement>('meta[name="vbios-cabinet-url"]')?.content || ''
    const serviceId = new URLSearchParams(window.location.search).get('shm_service')
    const validServiceId = serviceId && /^[1-9]\d{0,14}$/.test(serviceId) ? serviceId : null
    const cabinet = cabinetUrl.startsWith('https://') ? cabinetUrl.replace(/\/+$/, '') : ''
    const serviceUrl = cabinet ? `${cabinet}/services${validServiceId ? `/${validServiceId}` : ''}` : ''
    const subscriptionUrl = constructSubscriptionUrl(window.location.href, subscription.user.shortUuid)
    const isActive = subscription.user.userStatus === 'ACTIVE'
    const hasCustomLogo = !!config.brandingSettings.logoUrl && !config.brandingSettings.logoUrl.includes('docs.rw')
    const hasPlatformApps: Record<TSubscriptionPagePlatformKey, boolean> = {
        ios: Boolean(config.platforms.ios?.apps.length),
        android: Boolean(config.platforms.android?.apps.length),
        linux: Boolean(config.platforms.linux?.apps.length),
        macos: Boolean(config.platforms.macos?.apps.length),
        windows: Boolean(config.platforms.windows?.apps.length),
        androidTV: Boolean(config.platforms.androidTV?.apps.length),
        appleTV: Boolean(config.platforms.appleTV?.apps.length)
    }
    const SubscriptionInfoBlockRenderer = SUBSCRIPTION_INFO_BLOCK_RENDERERS[config.uiConfig.subscriptionInfoBlockType]
    const hasGuide = Object.values(hasPlatformApps).some(Boolean)

    return (
        <Page>
            <Box className="header-wrapper" py="sm">
                <Container maw={1240} px={{ base: 'md', sm: 'lg' }}>
                    <Group justify="space-between" wrap="nowrap">
                        <Group gap="sm" wrap="nowrap">
                            {hasCustomLogo ? <Image alt="" fit="contain" src={config.brandingSettings.logoUrl} w={32} h={32} /> : <RemnawaveLogo c="blue" size={32} />}
                            <Title order={4} size="lg">{config.brandingSettings.title}</Title>
                        </Group>
                        <Group gap="xs" wrap="nowrap">
                            {cabinet && <Button component="a" href={serviceUrl} variant="subtle" size="compact-sm">Личный кабинет</Button>}
                            <ActionIcon variant="light" size="lg" aria-label="Сменить тему" onClick={() => toggleColorScheme()}>{colorScheme === 'dark' ? <IconSun size={19} /> : <IconMoon size={19} />}</ActionIcon>
                            <SubscriptionLinkWidget hideGetLink={config.baseSettings.hideGetLinkButton} supportUrl={config.brandingSettings.supportUrl} />
                        </Group>
                    </Group>
                </Container>
            </Box>

            <Container maw={1240} px={{ base: 'md', sm: 'lg' }} py="xl" className="subscription-content">
                <Stack gap="xl">
                    {serviceUrl && <Anchor href={serviceUrl} size="sm" className="subscription-back"><IconArrowLeft size={16} /> Моя услуга</Anchor>}
                    <div className="subscription-hero">
                    <section className="subscription-hero-copy">
                        <Title order={1} className="subscription-hero-title">Всё готово<br /><span>к подключению.</span></Title>
                        <Text className="subscription-hero-description">Ваша подписка, ссылка и инструкция по настройке — всё на одной странице.</Text>
                        {hasGuide && <Button component="a" href="#installation-guide" size="md" radius="md" rightSection={<IconArrowRight size={17} />}>Как подключиться</Button>}
                    </section>
                    <div className="subscription-hero-panels">
                    <Paper withBorder radius="lg" p={{ base: 'md', sm: 'xl' }} className="subscription-panel subscription-summary">
                        <div className="subscription-panel-top"><span className="subscription-icon-wrap"><IconShieldCheck className="subscription-shield" size={30} stroke={1.5} /></span></div>
                        <Group justify="space-between" align="flex-start" gap="xs">
                            <Box>
                                <Text size="sm" c="dimmed">Подписка</Text>
                                <Title order={2} className="subscription-title">{SubscriptionInfoBlockRenderer ? subscription.user.username : 'Подключение'}</Title>
                            </Box>
                            {SubscriptionInfoBlockRenderer && <Badge color={isActive ? 'teal' : 'red'} variant="light">{isActive ? 'Активна' : 'Неактивна'}</Badge>}
                        </Group>
                        {SubscriptionInfoBlockRenderer && <Box mt="lg"><SubscriptionInfoBlockRenderer isMobile={isMobile} /></Box>}
                        {serviceUrl && <Button component="a" href={serviceUrl} variant="filled" fullWidth mt="lg" rightSection={<IconArrowRight size={17} />}>Управлять услугой</Button>}
                    </Paper>
                    {!config.baseSettings.hideGetLinkButton && <Paper withBorder radius="lg" p={{ base: 'md', sm: 'xl' }} className="subscription-panel subscription-quick-connect">
                        <div className="subscription-panel-top"><span className="subscription-icon-wrap"><IconQrcode className="subscription-shield" size={30} stroke={1.5} /></span></div>
                        <Title order={2} className="subscription-quick-title">Подключить устройство</Title>
                        <Text className="subscription-quick-description">Откройте QR-код или скопируйте ссылку для приложения.</Text>
                        <SubscriptionLinkWidget buttonOnly hideGetLink={false} supportUrl="" />
                    </Paper>}
                    </div>
                    </div>

                    {!config.baseSettings.hideGetLinkButton && <Paper withBorder radius="lg" p={{ base: 'md', sm: 'xl' }} className="subscription-panel">
                        <Stack gap="md">
                            <Box><Title order={2} size="h4">Подключение к сервису</Title><Text size="sm" c="dimmed">Добавьте ссылку в приложение или отсканируйте QR-код.</Text></Box>
                            <Box className="subscription-address"><Text size="xs" c="dimmed" mb={6}>Ссылка на подписку</Text><Group wrap="nowrap" gap="xs"><Text className="subscription-url" size="sm">{subscriptionUrl}</Text><ActionIcon aria-label="Скопировать ссылку подписки" variant="light" onClick={() => clipboard.copy(subscriptionUrl)}>{clipboard.copied ? <IconCheck size={17} /> : <IconCopy size={17} />}</ActionIcon></Group></Box>
                            <Group className="subscription-actions" grow>
                                <SubscriptionLinkWidget buttonOnly hideGetLink={false} supportUrl="" />
                                {hasGuide && <Button component="a" href="#installation-guide" variant="filled">Как подключиться</Button>}
                            </Group>
                            {clipboard.copied && <Text size="xs" c="teal" role="status">Ссылка скопирована</Text>}
                        </Stack>
                    </Paper>}

                    {hasGuide && <Box id="installation-guide"><InstallationGuideConnector BlockRenderer={BLOCK_RENDERERS[config.uiConfig.installationGuidesBlockType]} hasPlatformApps={hasPlatformApps} isMobile={isMobile} platform={platform} /></Box>}
                    <RawKeysWidget isMobile={isMobile} />

                    {cabinet && <Paper withBorder radius="lg" p={{ base: 'md', sm: 'xl' }} className="subscription-panel">
                        <Stack gap="md">
                            <Box><Title order={2} size="h4">Управление подпиской</Title><Text size="sm" c="dimmed">Устройства, тариф и оплата доступны в личном кабинете.</Text></Box>
                            <Group className="subscription-actions" grow>
                                <Button component="a" href={serviceUrl} variant="light" leftSection={<IconDeviceMobile size={18} />}>Устройства и тариф</Button>
                                <Button component="a" href={`${cabinet}/balance`} variant="light" leftSection={<IconWallet size={18} />}>Баланс и оплата</Button>
                            </Group>
                        </Stack>
                    </Paper>}
                    <Center><LanguagePicker currentLang={currentLang} locales={config.locales} onLanguageChange={setLanguage} /></Center>
                    <Center><Anchor href="https://pbalka.ru" size="xs" target="_blank" rel="noopener noreferrer">Remnawave / vBios</Anchor></Center>
                </Stack>
            </Container>
        </Page>
    )
}
