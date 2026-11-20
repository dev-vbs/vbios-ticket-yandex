import { SubscriptionInfoCardsWidget } from './subscription-info-cards.widget'

interface IProps {
    isMobile: boolean
}

export const SubscriptionInfoExpandedWidget = ({ isMobile }: IProps) => {
    return <SubscriptionInfoCardsWidget isMobile={isMobile} />
}
