import { getDocMetadata } from "@code-altas/ui/server"
import { DocsPage, type DocsPageProps } from "@code-altas/ui"

export const dynamic = "force-dynamic"

type RoutePageProps = Pick<DocsPageProps, "params">

export async function generateMetadata({ params }: RoutePageProps) {
  const { slug } = await params
  return getDocMetadata(`/${(slug ?? []).join("/")}`)
}

export default function Page({ params }: RoutePageProps) {
  return <DocsPage params={params} />
}
