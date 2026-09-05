import AnchorJS from 'anchor-js'
import toc from './toc'
import archerUtil from './util'

const init = function () {
  const loadingScreen = document.querySelector('.loading-screen')
  const loadingBar = loadingScreen && loadingScreen.querySelector('.loading-progress-bar')
  const loadingPercent = loadingScreen && loadingScreen.querySelector('.loading-percent')
  let loadingProgress = 0
  let progressTimer = null
  let loadingFinished = false

  const setLoadingProgress = (nextProgress) => {
    if (!loadingScreen || loadingFinished) return
    loadingProgress = Math.max(loadingProgress, Math.min(100, Math.round(nextProgress)))
    if (loadingBar) loadingBar.style.width = `${loadingProgress}%`
    if (loadingPercent) loadingPercent.textContent = `${loadingProgress}%`
  }

  const finishLoading = () => {
    if (!loadingScreen || loadingFinished) return
    loadingFinished = true
    if (progressTimer) window.clearInterval(progressTimer)
    if (loadingBar) loadingBar.style.width = '100%'
    if (loadingPercent) loadingPercent.textContent = '100%'
    window.requestAnimationFrame(() => loadingScreen.remove())
  }

  if (loadingScreen) {
    setLoadingProgress(4)
    progressTimer = window.setInterval(() => {
      if (loadingProgress < 86) {
        setLoadingProgress(loadingProgress + Math.max(1, (86 - loadingProgress) * 0.08))
      }
    }, 80)
  }

  // Remove site intro image placeholder
  const $introImg = $('.site-intro-img:first'),
    $introPlaceholder = $('.site-intro-placeholder:first'),
    bgCSS = $introImg.css('background-image'),
    bgRegResult = bgCSS.match(/url\("*([^"]*)"*\)/)

  if (bgRegResult.length < 2) {
    console.error(
      "Error while loading site intro image. Please check image's url."
    )
    console.log(bgRegResult)
  } else {
    const bgURL = bgRegResult[1],
      img = new Image()

    img.onload = () => {
      $introPlaceholder.remove()
      console.info('site intro image loaded.')
    }
    img.src = bgURL
  }

  // Dom content loaded event
  const revealContent = function () {
      $('.container').removeClass('container-unloaded')
      $('.footer').removeClass('footer-unloaded')
      setLoadingProgress(72)

      // Jump to url hash location if exit
      const currentHash = window.location.hash
      window.location.hash = archerUtil.getWindowHash()
      window.history.replaceState({}, '', currentHash)

      // Init anchors
      // https://www.bryanbraun.com/anchorjs/
      const anchors = new AnchorJS()
      anchors.options = {
        placement: 'right',
        class: 'anchorjs-archer',
      }
      anchors.add()

      // As headers' absolute offset-y can be queried properly
      // after remove container's `container-unloaded` class,
      // so we should init toc here for better performance.
      toc()
      finishLoading()
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', revealContent, { once: true })
  } else {
    revealContent()
  }
}

export default init
