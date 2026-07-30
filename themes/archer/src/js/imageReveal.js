(function () {
  'use strict'

  var images = document.querySelectorAll('.blur-up-image')

  for (var index = 0; index < images.length; index += 1) {
    attachReveal(images[index])
  }

  function attachReveal(image) {
    var reveal = function () {
      window.requestAnimationFrame(function () {
        image.classList.add('is-loaded')
      })
    }

    if (image.complete && image.naturalWidth > 0) {
      reveal()
      return
    }

    image.addEventListener('load', reveal, { once: true })
    image.addEventListener(
      'error',
      function () {
        image.classList.add('is-error')
      },
      { once: true }
    )
  }
})()
