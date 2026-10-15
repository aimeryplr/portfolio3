interface Props {
  src: string;
  alt: string;
}

// the screenshot in a plain frame
export default function ProjectShot({ src, alt }: Props) {
  return (
    <div className="shot">
      <img className="shot-img" src={src} alt={alt} loading="lazy" decoding="async" />
    </div>
  );
}
