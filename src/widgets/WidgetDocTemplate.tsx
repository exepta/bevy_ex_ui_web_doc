type WidgetDocTemplateProps = {
  name: string
  description: string
}

function WidgetDocTemplate({ name, description }: WidgetDocTemplateProps) {
  return (
    <article className="widget-doc">
      <h3>{name} Overview</h3>
      <p>{description}</p>
      <div className="widget-demo">
        <p>Example and API details for {name} can be documented here.</p>
      </div>
    </article>
  )
}

export default WidgetDocTemplate
