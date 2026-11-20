import { IconChevronDown } from '@tabler/icons-react'
import { Collapse, Group, Text, UnstyledButton } from '@mantine/core'
import { useState } from 'react'

import { vibrate } from '@shared/utils/vibrate'

import { SubscriptionInfoCardsWidget } from './subscription-info-cards.widget'

interface IProps {
    isMobile: boolean
}

export const SubscriptionInfoCollapsedWidget = ({ isMobile }: IProps) => {
    const [isExpanded, setIsExpanded] = useState(false)

    return (
        <div className="subscription-collapsed-details">
            <UnstyledButton
                className="subscription-details-toggle"
                aria-expanded={isExpanded}
                onClick={() => {
                    vibrate('tap')
                    setIsExpanded((expanded) => !expanded)
                }}
            >
                <Group justify="space-between" wrap="nowrap" gap="xs">
                    <Text size="sm" fw={600}>{isExpanded ? 'Свернуть' : 'Подробнее о подписке'}</Text>
                    <IconChevronDown size={18} style={{ transform: isExpanded ? 'rotate(180deg)' : undefined }} />
                </Group>
            </UnstyledButton>
            <Collapse expanded={isExpanded}>
                <div className="subscription-collapsed-content">
                    <SubscriptionInfoCardsWidget isMobile={isMobile} />
                </div>
            </Collapse>
        </div>
    )
}
