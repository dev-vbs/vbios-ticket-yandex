import {
    APP_CONFIG_ROUTE_LEADING_PATH,
    SubscriptionPageRawConfigSchema
} from '@remnawave/subscription-page-types'
import { GetSubscriptionInfoByShortUuidCommand } from '@remnawave/backend-contract'
import { Outlet } from 'react-router'
import { useLayoutEffect, useState } from 'react'
import { Alert, Button, Stack } from '@mantine/core'
import consola from 'consola/browser'
import { ofetch } from 'ofetch'

import {
    useSubscriptionInfoStoreActions,
    useSubscriptionInfoStoreInfo
} from '@entities/subscription-info-store'
import { useAppConfigStoreActions, useIsConfigLoaded } from '@entities/app-config-store'
import { LoadingScreen } from '@shared/ui'

import classes from './root.module.css'

export function RootLayout() {
    const [loadError, setLoadError] = useState(false)
    const subscriptionActions = useSubscriptionInfoStoreActions()
    const configActions = useAppConfigStoreActions()

    const { subscription } = useSubscriptionInfoStoreInfo()
    const isConfigLoaded = useIsConfigLoaded()

    useLayoutEffect(() => {
        const timer = window.setTimeout(() => setLoadError(true), 15000)
        const subPageDiv = document.getElementById('sbpg')

        if (subPageDiv) {
            const subscriptionUrl = subPageDiv.dataset.panel

            if (subscriptionUrl) {
                try {
                    const subscription: GetSubscriptionInfoByShortUuidCommand.Response = JSON.parse(
                        new TextDecoder().decode(Uint8Array.from(atob(subscriptionUrl), char => char.charCodeAt(0)))
                    )

                    subscriptionActions.setSubscriptionInfo({
                        subscription: subscription.response
                    })
                } catch (error) {
                    consola.log(error)
                } finally {
                    subPageDiv.remove()
                }
            }
        }

        const fetchConfig = async () => {
            try {
                const tempConfig = await ofetch<unknown>(
                    `${APP_CONFIG_ROUTE_LEADING_PATH}?v=${Date.now()}`,
                    {
                        parseResponse: (response) => JSON.parse(response)
                    }
                )

                const parsedConfig =
                    await SubscriptionPageRawConfigSchema.safeParseAsync(tempConfig)

                if (!parsedConfig.success) {
                    consola.error('Failed to parse app config:', parsedConfig.error)
                    return
                }

                configActions.setConfig(parsedConfig.data)
            } catch (error) {
                consola.error('Failed to fetch app config:', error)
            }
        }

        fetchConfig()
        return () => window.clearTimeout(timer)
    }, [])

    if ((!isConfigLoaded || !subscription) && loadError) return <Stack p="xl"><Alert title="Не удалось загрузить подписку" color="orange">Проверьте ссылку и подключение к интернету. Если ошибка повторяется, обратитесь в поддержку.</Alert><Button onClick={() => window.location.reload()}>Повторить</Button></Stack>
    if (!isConfigLoaded || !subscription) {
        return (
            <div className={classes.root}>
                <div className="animated-background"></div>
                <div className={classes.content}>
                    <main className={classes.main}>
                        <LoadingScreen height="100vh" />
                    </main>
                </div>
            </div>
        )
    }

    return (
        <div className={classes.root}>
            <div className="animated-background"></div>
            <div className={classes.content}>
                <main className={classes.main}>
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
