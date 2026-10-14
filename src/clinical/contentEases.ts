import gsap from 'gsap';
import {CustomEase} from 'gsap/CustomEase';
import T from './tokens.json';

// Compile the authored cubic curves once. The shell keeps its numerical spring;
// these functions belong only to finite general-content entrances and exits.
gsap.registerPlugin(CustomEase);
const coordinates=(value:string)=>value.replace(/^cubic-bezier\((.*)\)$/,'$1');
export const contentEaseOut=CustomEase.create('ci-content-out',coordinates(T.css['ease-out']));
export const contentEaseIn=CustomEase.create('ci-content-in',coordinates(T.css['ease-in']));
