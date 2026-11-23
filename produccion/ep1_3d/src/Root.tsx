import React from 'react';
import {Composition} from 'remotion';
import {Ep1, TOTAL} from './Ep1';
export const Root: React.FC = () => <Composition id="Ep1" component={Ep1} durationInFrames={TOTAL} fps={30} width={1080} height={1920} />;
