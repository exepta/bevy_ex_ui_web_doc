import { describe, expect, it } from 'vitest'
import { applyWasmExamplesToMarkdown, parseWasmExamplesByCategory } from './wasmExamples'

describe('wasm examples docs binding', () => {
  it('maps category names to normalized markdown entry names', () => {
    const parsed = parseWasmExamplesByCategory({
      category: [
        {
          name: 'button',
          examples: [{ id: 'button_default', iframe_src: '{base.url}/examples/button', html: '<button>Ok</button>', css: 'row' }],
        },
      ],
    })

    const transformed = applyWasmExamplesToMarkdown('<iframe id="button_default"></iframe>', 'Widgets/02_Button', parsed)
    expect(transformed).toContain('/examples/base/?example=button_default')
  })

  it('supports multiple iframe bindings in one markdown file and leaves unknown iframe ids untouched', () => {
    const parsed = parseWasmExamplesByCategory({
      category: [
        {
          name: 'button',
          examples: [
            {
              id: 'button_default',
              iframe_src: '{base.url}/examples/button',
              html: '<div><button>Button</button><button>Disabled</button></div>',
              css: 'column, gap:15px',
            },
            {
              id: 'button_icon_only',
              iframe_src: '{base.url}/examples/button',
              html: '<div><button><icon src="icons/check-mark.png"></icon></button></div>',
              css: 'row, gap:8px',
            },
          ],
        },
      ],
    })

    const source =
      '<iframe id="button_default"></iframe>\n<iframe id="button_icon_only"></iframe>\n<iframe id="unknown"></iframe>'
    const transformed = applyWasmExamplesToMarkdown(source, 'Widgets/02_Button', parsed)

    expect(transformed).toContain('/examples/base/?example=button_default')
    expect(transformed).toContain('/examples/base/?example=button_icon_only')
    expect(transformed).toContain('<iframe id="unknown"></iframe>')
  })

  it('ignores non-matching categories and invalid payloads', () => {
    const parsed = parseWasmExamplesByCategory({ categories: [] })
    const transformed = applyWasmExamplesToMarkdown('<iframe id="button_default"></iframe>', 'Widgets/02_Button', parsed)
    expect(transformed).toBe('<iframe id="button_default"></iframe>')
  })

  it('normalizes localhost absolute iframe_src to current app origin', () => {
    const parsed = parseWasmExamplesByCategory({
      category: [
        {
          name: 'button',
          examples: [
            {
              id: 'button_default',
              iframe_src: 'http://localhost:8080/examples/base/',
              html: '<button>Ok</button>',
              css: 'row',
            },
          ],
        },
      ],
    })

    const transformed = applyWasmExamplesToMarkdown('<iframe id="button_default"></iframe>', 'Widgets/02_Button', parsed)
    expect(transformed).toContain('src="/examples/base/?example=button_default')
    expect(transformed).not.toContain('http://localhost:8080/examples/base/')
  })

  it('replaces image placeholders in html markup', () => {
    const parsed = parseWasmExamplesByCategory({
      category: [
        {
          name: 'button',
          examples: [
            {
              id: 'button_default',
              iframe_src: '{base.url}/examples/base',
              html: '<div><img src="{custom.png}" /><img src="{example_image}" /></div>',
              css: '',
            },
          ],
        },
      ],
    })

    const transformed = applyWasmExamplesToMarkdown('<iframe id="button_default"></iframe>', 'Widgets/02_Button', parsed)
    expect(transformed).toContain('icons%2Fcustom.png')
    expect(transformed).toContain('bevy.png')
  })

  it('replaces icon placeholders with asset-root icon paths', () => {
    const parsed = parseWasmExamplesByCategory({
      category: [
        {
          name: 'button',
          examples: [
            {
              id: 'button_default',
              iframe_src: '{base.url}/examples/base',
              html: '<checkbox icon="{custom.png}">A</checkbox><button><icon src="{custom.png}"></icon></button>',
              css: '',
            },
          ],
        },
      ],
    })

    const transformed = applyWasmExamplesToMarkdown('<iframe id="button_default"></iframe>', 'Widgets/02_Button', parsed)
    expect(transformed).toContain('icon%3D%22examples%2Ficons%2Fcustom.png%22')
    expect(transformed).toContain('src%3D%22examples%2Ficons%2Fcustom.png%22')
  })

  it('normalizes old examples/icons src paths to relative icon paths', () => {
    const parsed = parseWasmExamplesByCategory({
      category: [
        {
          name: 'button',
          examples: [
            {
              id: 'button_default',
              iframe_src: '{base.url}/examples/base',
              html: '<div><img src="examples/icons/custom.png" /></div>',
              css: '',
            },
          ],
        },
      ],
    })

    const transformed = applyWasmExamplesToMarkdown('<iframe id="button_default"></iframe>', 'Widgets/02_Button', parsed)
    expect(transformed).toContain('src%3D%22icons%2Fcustom.png%22')
    expect(transformed).not.toContain('examples%2Ficons%2Fcustom.png')
  })

  it('normalizes icon widget src and icon attributes to examples/icons paths', () => {
    const parsed = parseWasmExamplesByCategory({
      category: [
        {
          name: 'button',
          examples: [
            {
              id: 'button_default',
              iframe_src: '{base.url}/examples/base',
              html: '<button><icon src="icons/check-mark.png"></icon></button><checkbox icon="icons/custom.png">A</checkbox>',
              css: '',
            },
          ],
        },
      ],
    })

    const transformed = applyWasmExamplesToMarkdown('<iframe id="button_default"></iframe>', 'Widgets/02_Button', parsed)
    expect(transformed).toContain('src%3D%22examples%2Ficons%2Fcheck-mark.png%22')
    expect(transformed).toContain('icon%3D%22examples%2Ficons%2Fcustom.png%22')
    expect(transformed).not.toContain('src%3D%22icons%2Fcheck-mark.png%22')
    expect(transformed).not.toContain('icon%3D%22icons%2Fcustom.png%22')
  })

  it('passes css commands through to wasm runtime parser', () => {
    const parsed = parseWasmExamplesByCategory({
      category: [
        {
          name: 'button',
          examples: [
            {
              id: 'button_default',
              iframe_src: '{base.url}/examples/base',
              html: '<button>Ok</button>',
              css: 'row',
            },
          ],
        },
      ],
    })

    const transformed = applyWasmExamplesToMarkdown('<iframe id="button_default"></iframe>', 'Widgets/02_Button', parsed)
    expect(transformed).toContain('css=row')
  })

  it('supports comma-separated css commands and custom gap values', () => {
    const parsed = parseWasmExamplesByCategory({
      category: [
        {
          name: 'button',
          examples: [
            {
              id: 'button_default',
              iframe_src: '{base.url}/examples/base',
              html: '<button>Ok</button>',
              css: 'row, gap:12px, al:center, jc:center',
            },
          ],
        },
      ],
    })

    const transformed = applyWasmExamplesToMarkdown('<iframe id="button_default"></iframe>', 'Widgets/02_Button', parsed)
    expect(transformed).toContain('css=row%2Cgap%3A12px%2Cal%3Acenter%2Cjc%3Acenter')
  })

  it('supports jc/al/center command presets for alignment behavior', () => {
    const parsed = parseWasmExamplesByCategory({
      category: [
        {
          name: 'button',
          examples: [
            { id: 'button_jc', iframe_src: '{base.url}/examples/base', html: '<button>1</button>', css: 'jc:center' },
            { id: 'button_al', iframe_src: '{base.url}/examples/base', html: '<button>2</button>', css: 'al:center' },
            {
              id: 'button_center',
              iframe_src: '{base.url}/examples/base',
              html: '<button>3</button>',
              css: 'center:center',
            },
          ],
        },
      ],
    })

    const source =
      '<iframe id="button_jc"></iframe>\n<iframe id="button_al"></iframe>\n<iframe id="button_center"></iframe>'
    const transformed = applyWasmExamplesToMarkdown(source, 'Widgets/02_Button', parsed)

    expect(transformed).toContain('button_jc')
    expect(transformed).toContain('css=jc%3Acenter')

    expect(transformed).toContain('button_al')
    expect(transformed).toContain('css=al%3Acenter')

    expect(transformed).toContain('button_center')
    expect(transformed).toContain('css=center%3Acenter')
  })
})
