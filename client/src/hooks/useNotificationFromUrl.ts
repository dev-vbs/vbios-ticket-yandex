import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { notifications } from '@mantine/notifications'

export function useNotificationFromUrl() {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const title = params.get('_nt')
    const body = params.get('_nb')
    const authStatus = params.get('tg_status') || params.get('oauth2_status')
    if (authStatus) {
      const error = params.get('error')
      const alreadyBound = authStatus === 'already_bound'
      const succeeded = authStatus === 'success' || alreadyBound
      let errorText = ''
      if (error) {
        try { errorText = decodeURIComponent(error).replace(/[<>]/g, '') } catch { errorText = error.replace(/[<>]/g, '') }
      }
      notifications.show({
        color: succeeded ? 'green' : 'red',
        message: alreadyBound
          ? 'Этот аккаунт уже привязан к вашему профилю.'
          : authStatus === 'success'
          ? (location.pathname.includes('profile') ? 'Аккаунт успешно привязан.' : 'Вход выполнен.')
          : authStatus === 'already_exists'
            ? 'Этот аккаунт привязан к другому пользователю. Для входа выйдите из текущего профиля и выберите вход через Telegram.'
            : error === 'Profile already bound to another Telegram account'
              ? 'К вашему профилю уже привязан другой аккаунт Telegram. Для изменения привязки обратитесь в поддержку.'
          : errorText
            ? `Не удалось завершить вход: ${errorText}`
            : 'Не удалось завершить вход или привязку. Повторите попытку. Если ошибка повторяется, обратитесь в поддержку.',
        autoClose: succeeded ? 5000 : 10000,
      })
      for (const key of ['tg_status', 'oauth2_status', 'error', 'msg']) params.delete(key)
      const query = params.toString()
      navigate(location.pathname + (query ? '?' + query : '') + location.hash, { replace: true })
      return
    }
    if (!title && !body) return

    notifications.show({
      title: title || undefined,
      message: body || '',
      color: 'blue',
      autoClose: 6000,
    })

    params.delete('_nt')
    params.delete('_nb')
    const newSearch = params.toString()
    navigate(location.pathname + (newSearch ? '?' + newSearch : ''), { replace: true })
  }, [])
}
