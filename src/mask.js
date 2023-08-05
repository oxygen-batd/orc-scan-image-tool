const { ipcRenderer, clipboard, nativeImage } = require('electron');
const { getCurrentWindow } = require('@electron/remote');

var Tesseract = require('tesseract.js');


function blob_to_buffer(blob, callback) {
    const file_reader = new FileReader()

    file_reader.addEventListener("loadend", event => {
        if (file_reader.error) {
            callback(file_reader.error)
        } else {
            callback(null, Buffer.from(file_reader.result))
        }
    }, false)

    file_reader.readAsArrayBuffer(blob)
    return file_reader
}

var window = getCurrentWindow();


function mask(imageURL, type) {
    const target = document.getElementById("target");
    target.src = imageURL;
    Jcrop.load('target').then(img => {
        const stage = Jcrop.attach('target', {
            shade: true
        });
        stage.addClass('jcrop-ux-no-outline');
        stage.listen('crop.change', function (widget, e) {
            const pos = widget.pos;
            const x1 = document.getElementById("snackbarLoad");
            x1.className = "show";

            const cc = pos
            const image = document.getElementById("target");

            const heightScale = (image.naturalHeight / image.height)
            const widthScale = (image.naturalWidth / image.width)

            cc.x = cc.x * widthScale
            cc.y = cc.y * heightScale;
            cc.w = cc.w * widthScale;
            cc.h = cc.h * heightScale;

            const canvasElement = document.createElement("canvas");

            canvasElement.width = Math.floor(cc.w);
            canvasElement.height = Math.floor(cc.h);
            const ctx = canvasElement.getContext("2d");

            ctx.drawImage(image, cc.x, cc.y, cc.w, cc.h, 0, 0, canvasElement.width, canvasElement.height);
            stage.destroy()

            if (type == 1) {
                canvasElement.toBlob(function (blob) {
                    blob_to_buffer(blob, async (err, buffer) => {
                        if (err) console.log("err")

                        const native_image = nativeImage.createFromBuffer(buffer);
                        clipboard.writeImage(native_image)

                        const x = document.getElementById("snackbarText");
                        x.innerHTML = "Cropped image copied to clipboard..!!❤️"
                        x1.className = x1.className.replace("show", "");
                        x.className = "show";
                        setTimeout(function () {
                            x.className = x.className.replace("show", "");
                            window.close();
                        }, 1000);
                    })
                })
            }
            else if (type == 2) {
                const imgUrl = canvasElement.toDataURL();
                Tesseract.recognize(
                    imgUrl,
                    'jpn',
                    { logger: m => console.log(m) }
                ).then(({ data: { text } }) => {
                    clipboard.writeText(text)
                    const x = document.getElementById("snackbarText");
                    x.innerHTML = "Text copied to clipboard..!!❤️";
                    x1.className = x1.className.replace("show", "");
                    x.className = "show";
                    setTimeout(function () {
                        x.className = x.className.replace("show", "");
                        window.close();
                    }, 1000);
                })
            }

        })
    })
    ipcRenderer.send('show-window');
}

ipcRenderer.on('request-object', function (event, requestObject) {
    var imageUrl = requestObject.imageURL;
    var type = requestObject.type;
    if (type == 1) {
        mask(imageUrl, 1);
    }
    else if (type == 2) {
        mask(imageUrl, 2);
    }
});