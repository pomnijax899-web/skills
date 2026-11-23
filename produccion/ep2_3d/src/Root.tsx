import React from 'react';
import {Composition} from 'remotion';
import {Ep2, TOTAL} from './Ep2';
export const Root: React.FC = () => <Composition id="Ep2" component={Ep2} durationInFrames={TOTAL} fps={30} width={1080} height={1920} />;
