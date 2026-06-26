const fancyBoxInit = (img) => {
  const outer = img.outerHTML
  const imgSrc = img.getAttribute('src') || img.getAttribute('data-original')
  const imgAlt = img.getAttribute('alt') || img.getAttribute('title') || ''
  if (!imgSrc) return
  img.outerHTML =
    '<a class="fancy-link" href="' +
    imgSrc +
    '" data-fancybox="group" data-caption="' +
    imgAlt +
    '">' +
    outer +
    '</a>'
}

export default () => {
  document.querySelectorAll('.article-entry img').forEach(fancyBoxInit)
  document.querySelectorAll('.about-body .container img').forEach(fancyBoxInit)
}
