import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import styles from './VerificationPublique.module.css';

const CAMERA_SUPPORTEE =
  typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

/**
 * Scanner de QR code via la camera de l'appareil (getUserMedia + decodage jsQR
 * cote client, image par image, aucun appel serveur). Monte/demonte avec le
 * mode "scan" du parent — la camera est liberee au demontage.
 */
export default function QrScanner({ onDecode }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(null);
  const onDecodeRef = useRef(onDecode);
  const [erreur, setErreur] = useState(null);
  const [pret, setPret] = useState(false);

  useEffect(() => {
    onDecodeRef.current = onDecode;
  }, [onDecode]);

  useEffect(() => {
    if (!CAMERA_SUPPORTEE) return;

    let annule = false;

    function decoderImage() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
        frameRef.current = requestAnimationFrame(decoderImage);
        return;
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(image.data, image.width, image.height, { inversionAttempts: 'dontInvert' });
      if (code?.data) {
        onDecodeRef.current(code.data);
        return;
      }
      frameRef.current = requestAnimationFrame(decoderImage);
    }

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        if (annule) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setPret(true);
        frameRef.current = requestAnimationFrame(decoderImage);
      } catch {
        if (!annule) {
          setErreur("Impossible d'accéder à la caméra — vérifiez que vous avez autorisé son accès dans votre navigateur.");
        }
      }
    })();

    return () => {
      annule = true;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  const messageErreur = !CAMERA_SUPPORTEE
    ? "Votre navigateur ne permet pas d'accéder à la caméra. Utilisez un autre mode de vérification."
    : erreur;

  return (
    <div className={styles.scannerBox}>
      {messageErreur ? (
        <div className={styles.scannerErreur}>
          <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>videocam_off</span>
          <p>{messageErreur}</p>
        </div>
      ) : (
        <div className={styles.scannerViewport}>
          <video ref={videoRef} className={styles.scannerVideo} playsInline muted />
          <div className={styles.scannerFrame} />
          <p className={styles.scannerHint}>
            {pret ? 'Cadrez le QR code du diplôme' : 'Activation de la caméra…'}
          </p>
        </div>
      )}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
