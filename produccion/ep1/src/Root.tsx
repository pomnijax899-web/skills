import React from 'react';
import {Composition} from 'remotion';
import {Ep1} from './Ep1';
export const FPS = 30;
export const Root: React.FC = () => (
  <Composition id="Ep1" component={Ep1} durationInFrames={1080} fps={FPS} width={1080} height={1920} />
);
