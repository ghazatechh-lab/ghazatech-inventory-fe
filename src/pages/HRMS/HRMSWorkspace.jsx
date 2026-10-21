import React from 'react';
import {Navigate,useParams,useSearchParams} from 'react-router-dom';
import {useAuth} from '../../context/AuthContext';
import {HRMSView} from './HRMSView';
import {HolidayCalendar} from './HolidayCalendar';
import {hrSections} from './schema';
export const workspaces={
 employees:{title:'Employees',tabs:[['employees','Employees','employees'],['designations','Designations','designations']]},
 attendance:{title:'Attendance',tabs:[['daily','Daily Attendance','attendance'],['history','Attendance History','attendance'],['shifts','Shifts','shifts'],['shift-assignments','Shift Assignments','shift-assignments']]},
 leaves:{title:'Leave Management',tabs:[['requests','Leave Requests','leaves'],['balances','Leave Balances','leave-balances'],['types','Leave Types','leave-types']]},
 payroll:{title:'Payroll',tabs:[['records','Payroll Records','payroll'],['periods','Payroll Periods','payroll-periods'],['structures','Salary Structures','salary-structures'],['revisions','Salary Revisions','salary-revisions']]},
};
export const legacyRoutes={designations:['employees','designations'],departments:['employees',null],documents:['employees',null],shifts:['attendance','shifts'],'shift-assignments':['attendance','shift-assignments'],'leave-types':['leaves','types'],'leave-balances':['leaves','balances'],'payroll-periods':['payroll','periods'],'salary-structures':['payroll','structures'],'salary-revisions':['payroll','revisions']};
export function HRMSWorkspace(){
 const {section}=useParams();const [query,setQuery]=useSearchParams();const {hasPermission:can}=useAuth();
 if(legacyRoutes[section]){const [parent,tab]=legacyRoutes[section];const next=new URLSearchParams(query);if(tab)next.set('tab',tab);if(section==='documents'&&next.has('employee'))next.set('profileTab','documents');return <Navigate to={`/hrms/${parent}${next.size?'?'+next:''}`} replace/>}
 const config=workspaces[section];
 if(section==='holidays'){if(!can('hrms.holiday.view'))return <HRMSView section={section}/>;const calendar=query.get('tab')==='calendar';return <div className="space-y-5"><h1 className="text-2xl font-semibold">Holidays</h1><nav role="tablist" className="flex gap-2">{['list','calendar'].map(t=><button role="tab" aria-selected={calendar===(t==='calendar')} className={calendar===(t==='calendar')?'erp-primary':'erp-secondary'} key={t} onClick={()=>setQuery({tab:t})}>{t==='list'?'List view':'Calendar view'}</button>)}</nav>{calendar?<HolidayCalendar/>:<HRMSView section={section}/>}</div>}
 if(!config){if(!['salary-advances','holidays','policy'].includes(section))return <Navigate to="/hrms/employees" replace/>;return <HRMSView section={section}/>}
 const tabs=config.tabs.filter(([, ,source])=>can(`hrms.${hrSections[source].resource}.view`));
 if(!tabs.length)return <section className="erp-panel p-8"><h1 className="text-xl font-semibold">Access restricted</h1><p>Your account does not have permission to view this workspace.</p></section>;
 const active=tabs.find(([id])=>id===query.get('tab'))||tabs[0];
 return <div className="space-y-5"><div><h1 className="text-2xl font-semibold">{config.title}</h1><p className="text-sm text-slate-500 mt-1">Manage related records in one workspace.</p></div><nav role="tablist" aria-label={config.title} className="erp-panel p-3 flex flex-wrap gap-2">{tabs.map(([id,title])=><button key={id} role="tab" aria-selected={active[0]===id} className={active[0]===id?'erp-primary':'erp-secondary'} onClick={()=>setQuery(q=>{q.set('tab',id);q.delete('employee');q.delete('profileTab');return q})}>{title}</button>)}</nav><section role="tabpanel" aria-label={active[1]}><HRMSView key={active[0]} section={active[2]} daily={section==='attendance'&&active[0]==='daily'} embedded/></section></div>
}
