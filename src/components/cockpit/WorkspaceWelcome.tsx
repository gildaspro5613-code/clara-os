import MainLayout from '@/components/layout/MainLayout';
import Cockpit from './Cockpit';

/** Authenticated workspace only. The existing Cockpit owns its empty rendering. */
export default function WorkspaceWelcome(){
 return <MainLayout nativeContextAvailable={false}><Cockpit workspaceOnly/></MainLayout>;
}
