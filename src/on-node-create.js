const grayMatter = require(`gray-matter`)
const crypto = require(`crypto`)
const _ = require(`lodash`)
const { mdxtype, mdxextensions } = require('./constants')

module.exports = async function onCreateNode(
  { node, loadNodeContent, actions, createNodeId },
  pluginOptions,
) {
  const { createNode, createParentChildLink } = actions

  // We only care about markdown content.
  /* We want to use mdx extension.
  if (
    node.internal.mediaType !== `text/markdown` &&
    node.internal.mediaType !== `text/x-markdown`
  ) {
    return
  }
  */
  // KWANG mdx extenstions
  if (!mdxextensions.includes(node.extension)) {
    return
  }
  const content = await loadNodeContent(node)
  const data = grayMatter(content, pluginOptions)

  // Convert date objects to string. Otherwise there's type mismatches
  // during inference as some dates are strings and others date objects.
  if (data.data) {
    data.data = _.mapValues(data.data, v => {
      if (_.isDate(v)) {
        return v.toJSON()
      }
      return v
    })
  }

  const markdownNode = {
    id: createNodeId(`${node.id} >>> ${mdxtype}`),
    children: [],
    parent: node.id,
    internal: {
      content: data.content,
      type: mdxtype,
    },
  }

  markdownNode.frontmatter = {
    title: ``, // always include a title
    ...data.data,
    _PARENT: node.id,
  }

  markdownNode.excerpt = data.excerpt
  markdownNode.rawMarkdownBody = data.content

  // Add path to the markdown file path
  if (node.internal.type === `File`) {
    markdownNode.fileAbsolutePath = node.absolutePath
  }

  markdownNode.internal.contentDigest = crypto
    .createHash(`md5`)
    .update(JSON.stringify(markdownNode))
    .digest(`hex`)

  createNode(markdownNode)
  createParentChildLink({ parent: node, child: markdownNode })
}
