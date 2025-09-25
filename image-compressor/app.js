const imageInput = document.getElementById('imageInput');
const targetSize = document.getElementById('targetSize');
const compressBtn = document.getElementById('compressBtn');
const resultDiv = document.getElementById('result');
const originalSize = document.getElementById('originalSize');
const originalPreview = document.getElementById('originalPreview');
const compressedSize = document.getElementById('compressedSize');
const compressedPreview = document.getElementById('compressedPreview');
const downloadLink = document.getElementById('downloadLink');

let originalFile = null;

imageInput.addEventListener('change', (e) => {
    originalFile = e.target.files[0];
    if (originalFile) {
        const reader = new FileReader();
        reader.onload = (event) => {
            originalPreview.src = event.target.result;
            originalSize.textContent = `サイズ: ${(originalFile.size / 1024).toFixed(2)} KB`;
            resultDiv.style.display = 'block';
            compressedPreview.style.display = 'none';
            downloadLink.style.display = 'none';
            compressedSize.textContent = '';
        };
        reader.readAsDataURL(originalFile);
    }
});

compressBtn.addEventListener('click', () => {
    if (!originalFile || !targetSize.value) {
        alert('画像を選択し、目標ファイルサイズを指定してください。');
        return;
    }

    const targetKB = parseFloat(targetSize.value);
    const targetBytes = targetKB * 1024;

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            // JPEG品質を二分探索で見つける
            let lower = 0;
            let upper = 1;
            let bestBlob = null;

            for (let i = 0; i < 10; i++) { // 10回の試行で十分な精度
                const mid = (lower + upper) / 2;
                const dataUrl = canvas.toDataURL('image/jpeg', mid);
                const blob = dataURLtoBlob(dataUrl);

                if (blob.size > targetBytes) {
                    upper = mid;
                } else {
                    lower = mid;
                    bestBlob = blob;
                }
            }

            if (bestBlob) {
                const blobUrl = URL.createObjectURL(bestBlob);
                compressedPreview.src = blobUrl;
                compressedPreview.style.display = 'block';
                compressedSize.textContent = `サイズ: ${(bestBlob.size / 1024).toFixed(2)} KB`;
                downloadLink.href = blobUrl;
                downloadLink.download = `compressed_${originalFile.name}`;
                downloadLink.style.display = 'inline-block';
            } else {
                alert('指定されたサイズまで圧縮できませんでした。目標サイズを上げてください。');
            }
        };
    };
    reader.readAsDataURL(originalFile);
});

function dataURLtoBlob(dataurl) {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}
