import {ProgressCircle, type ProgressCircleProps} from "@heroui/react";
import {useEffect, useRef} from "react";
import {useMotionValue, useSpring} from "motion/react";

export interface AnimatedProgressCircleProps extends ProgressCircleProps {
  percent: number;
  duration?: number;
}

function AnimatedProgressCircle(props: Readonly<AnimatedProgressCircleProps>) {
  const {percent, duration = 2, ...rest} = props;

  const damping = 20 + 40 * (1 / duration);
  const stiffness = 100 * (1 / duration);

  const ref = useRef<SVGCircleElement>(null);
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    damping,
    stiffness
  });

  useEffect(() => {
    motionValue.set(percent);
  }, []);

  useEffect(() => {
    const unsubscribe = springValue.on('change', (latest: number) => {
      if (ref.current) {
        ref.current.style.strokeDashoffset = (100 - latest).toString();
      }
    });

    return () => unsubscribe();
  }, [springValue])

  return (
    <ProgressCircle {...rest}>
      <ProgressCircle.Track>
        <ProgressCircle.TrackCircle/>
        <ProgressCircle.FillCircle ref={ref}/>
      </ProgressCircle.Track>
    </ProgressCircle>
  )
}

export default AnimatedProgressCircle;