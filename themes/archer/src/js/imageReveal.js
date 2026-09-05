(function () {
  'use strict'

  document.documentElement.classList.add('image-loader-ready')
  var images = document.querySelectorAll('.blur-up-image')

  for (var index = 0; index < images.length; index += 1) {
    attachReveal(images[index])
  }

  function attachReveal(image) {
    var frame = document.createElement('span')
    var progress = document.createElement('span')
    frame.className = 'image-load-frame'
    progress.className = 'image-load-progress'
    progress.setAttribute('aria-hidden', 'true')
    image.parentNode.insertBefore(frame, image)
    frame.appendChild(image)
    frame.appendChild(progress)

    var reveal = function () {
      // The lazy-loader removes data-original only after the full image loads.
      if (image.hasAttribute('data-original') || image.naturalWidth <= 0) return
      window.requestAnimationFrame(function () {
        image.classList.add('is-loaded')
        frame.classList.add('is-loaded')
      })
    }

    if (image.complete && image.naturalWidth > 0 && !image.hasAttribute('data-original')) reveal()
    image.addEventListener('load', reveal)
    image.addEventListener('error', function () {
      image.classList.add('is-error')
      frame.classList.add('is-error')
    })
  }
})()
