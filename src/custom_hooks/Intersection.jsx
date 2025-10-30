import { useState, useEffect, useRef } from 'react';

const useElementInView = (options) => {
  const [isInView, setIsInView] = useState(false);
  const targetRef = useRef(null);

  useEffect(() => {
    if (!targetRef.current) return;

    const observer = new IntersectionObserver((entries) => {
      setIsInView(entries[0].isIntersecting);
    }, options);

    observer.observe(targetRef.current);

    return () => observer.disconnect();
  }, [options.root, options.threshold]);

  return [targetRef, isInView];
};


export default useElementInView;