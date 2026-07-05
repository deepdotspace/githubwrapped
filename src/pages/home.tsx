/**
 * /home — legacy scaffold route, repurposed.
 *
 * The product entry point is the landing at `/`. Anything that still links to
 * `/home` just bounces there so there is one front door.
 */
import { Navigate } from 'react-router-dom'

export default function HomePage() {
  return <Navigate to="/" replace />
}
