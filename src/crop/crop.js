const { ipcRenderer, clipboard, nativeImage } = require('electron');
const { getCurrentWindow } = require('@electron/remote');
const Tesseract = require('tesseract.js');
var window = getCurrentWindow();

async function cropOrTesseractImage(imageURL, TypeRequest) {
    const target = document.getElementById("target");
    if (target && imageURL) {
        target.src = imageURL;
        Jcrop.load('target').then(img => {
            const stage = Jcrop.attach('target', {
                shade: true
            });
            stage.addClass('jcrop-ux-no-outline');
            try {
                stage.listen('crop.change', async function (widget, e) {
                    const pos = widget.pos;
                    const x1 = document.getElementById("spinner-load");
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
                    if (TypeRequest == 'CROP') {
                        canvasElement.toBlob(function (blob) {
                            blob_to_buffer(blob, async (err, buffer) => {
                                if (err) console.log("err")

                                const native_image = nativeImage.createFromBuffer(buffer);
                                clipboard.writeImage(native_image)

                                const alert = document.getElementById("alert");
                                if (alert) {
                                    alert.innerHTML = "Cropped image copied to clipboard."
                                    x1.className = x1.className.replace("show", "");
                                    alert.className = "show";
                                    setTimeout(function () {
                                        alert.className = alert.className.replace("show", "");
                                        window.close();
                                    }, 2000);
                                }
                            })
                        })
                    }
                    if (TypeRequest == 'OCR') {
                        const imgUrl = canvasElement.toDataURL();
                        const result = await Tesseract.recognize(imgUrl, 'jpn', {
                            logger: (m) => console.log(m)
                        });

                        if (result && result.data.text) {
                            clipboard.writeText(result.data.text);

                            const alert = document.getElementById("alert");
                            if (alert) {
                                alert.innerHTML = "Text copied to clipboard.";
                                x1.className = x1.className.replace("show", "");
                                alert.className = "show";
                                setTimeout(function () {
                                    alert.className = alert.className.replace("show", "");
                                    window.close();
                                }, 2000);
                            }
                        } else {
                            window.close();
                        }
                    }
                });
            }
            catch (err) {
                console.log(err);
                window.close();
            }
        })
    }
    ipcRenderer.send('show-window');
}

ipcRenderer.on('request-object', async function (event, requestObject) {
    const imageUrl = requestObject.imageURL;
    const TypeRequest = requestObject.type;
    if (TypeRequest) {
        await cropOrTesseractImage(imageUrl, TypeRequest);
    }
});

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
